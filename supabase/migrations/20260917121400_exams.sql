-- CodeSprint — exam mode (SPEC §27, §19, §42, Phase 13).
--
-- An exam differs from every other way of answering a question in this product, and every
-- difference is a rule the server has to keep:
--
--   * the question set is chosen and FROZEN when the attempt starts, so force-quitting does
--     not deal a new hand;
--   * there is no feedback until the end — no verdict, no explanation, no answer key;
--   * the clock is the server's, not the device's;
--   * lives are never consumed (SPEC §22 — an exam limits attempts instead);
--   * XP is paid on the SCORE, once, as the improvement over the learner's best (SPEC §19).

-- ---------------------------------------------------------------------------------------
-- 1. Config (SPEC §27, §50)
-- ---------------------------------------------------------------------------------------

/** Boolean config with a bundled fallback, alongside `config_int` and `config_numeric`. */
create or replace function public.config_bool(p_key text, p_default boolean)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select c.value #>> '{}' from public.app_config c where c.key = p_key)::boolean,
                  p_default);
$$;

comment on function public.config_bool(text, boolean) is
  'Boolean config read with a fallback, for flags read inside RPCs (SPEC §50).';

insert into public.app_config (key, value, is_public, description) values
  -- How late a submission is still taken at face value. A 45-minute exam arriving 20 seconds
  -- after the deadline is somebody on a slow connection, not somebody cheating; past this the
  -- saved answers are graded instead (see `submit_exam`).
  ('exam_submit_grace_seconds', '60'::jsonb, true,
   'How long after expiry a submitted payload is still accepted (SPEC §27).'),

  -- Exam composition by difficulty (SPEC §37). Shares rather than counts, so the same setting
  -- holds for a 10-question sample and a 30-question full exam.
  ('exam_difficulty_mix', '{"easy": 30, "medium": 45, "hard": 25}'::jsonb, false,
   'Target percentage of easy / medium / hard questions in an exam (SPEC §37).')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------------------
-- 2. Availability (SPEC §27)
-- ---------------------------------------------------------------------------------------

/**
 * Why a learner cannot start this exam right now, or null when they can.
 *
 * A code, not a sentence (SPEC §38). Both `get_exam_overview` and `start_exam` call it, so the
 * screen and the RPC can never disagree about whether a button should have worked: the list
 * greys an exam out for exactly the reason the RPC would have refused it.
 *
 * An OPEN attempt is not a reason — `start_exam` resumes it rather than refusing.
 */
create or replace function public.exam_unavailable_reason(p_user_id uuid, p_exam_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_exam public.exams;
  v_attempts integer;
  v_cooldown integer;
  v_last_submitted timestamptz;
  v_pool integer;
begin
  select * into v_exam from public.exams where id = p_exam_id;

  if v_exam.id is null or not v_exam.is_active then
    return 'not_found';
  end if;

  if not public.config_bool('exams_enabled', true) then
    return 'disabled';
  end if;

  -- The full exam is a Premium feature (SPEC §5), checked against `user_entitlements` on the
  -- server and never against a client flag (SPEC §31).
  if v_exam.requires_entitlement is not null
     and not public.has_entitlement(p_user_id, v_exam.requires_entitlement) then
    return 'requires_premium';
  end if;

  -- An open attempt is resumed, so it never blocks. Everything below counts finished ones.
  if exists (
    select 1 from public.exam_attempts a
    where a.user_id = p_user_id and a.exam_id = p_exam_id and a.submitted_at is null
      and (a.expires_at is null or a.expires_at > now())
  ) then
    return null;
  end if;

  -- Free learners get `free_exam_attempts_per_week` goes at an open exam. Premium retries are
  -- governed by a cooldown instead, which defaults to none (SPEC §27).
  if v_exam.requires_entitlement is null
     and not public.has_entitlement(p_user_id, 'premium') then
    select count(*)::integer into v_attempts
    from public.exam_attempts a
    where a.user_id = p_user_id
      and a.exam_id = p_exam_id
      and a.submitted_at is not null
      and a.started_at >= public.iso_week_start();

    if v_attempts >= public.config_int('free_exam_attempts_per_week', 1) then
      return 'no_attempts_left';
    end if;
  else
    v_cooldown := public.config_int('exam_retry_cooldown_hours', 0);

    if v_cooldown > 0 then
      select max(a.submitted_at) into v_last_submitted
      from public.exam_attempts a
      where a.user_id = p_user_id and a.exam_id = p_exam_id and a.submitted_at is not null;

      if v_last_submitted is not null
         and v_last_submitted > now() - make_interval(hours => v_cooldown) then
        return 'cooldown';
      end if;
    end if;
  end if;

  -- Content, not the learner. Worth its own reason: "come back when there are more questions"
  -- is a different message from "you have used this week's attempt", and until Phase 19 fills
  -- the course out it is the one that will actually happen.
  select count(*)::integer into v_pool
  from public.questions q
  join public.lessons l on l.id = q.lesson_id and l.is_active
  where q.is_active
    and q.is_exam_eligible
    and public.can_access_module(p_user_id, l.module_id)
    and (not q.is_premium or public.has_entitlement(p_user_id, 'premium'));

  if v_pool < v_exam.question_count then
    return 'pool_too_small';
  end if;

  return null;
end;
$$;

comment on function public.exam_unavailable_reason(uuid, uuid) is
  'Why an exam cannot be started, as a code the client localizes. Null means it can (SPEC §27).';

-- ---------------------------------------------------------------------------------------
-- 3. Choosing the questions (SPEC §27, §37)
-- ---------------------------------------------------------------------------------------

/**
 * The question set for one attempt.
 *
 * Difficulty matters to an exam in a way it does not to a practice set: thirty easy questions
 * is not the same exam as thirty hard ones, and a learner who happened to draw the easy end
 * would not be measured against the same thing as the next candidate. So the mix is a target,
 * filled per bucket, and topped up at random only where a bucket falls short — which, until
 * Phase 19 fills the course out, it often will.
 *
 * Filtered by `can_access_module` and the per-question premium flag for the same reason
 * practice is: an exam must not become a way to read content the learner has not unlocked.
 */
create or replace function public.exam_question_set(p_user_id uuid, p_exam_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_premium boolean := public.has_entitlement(p_user_id, 'premium');
  v_mix jsonb;
  v_chosen uuid[];
begin
  select e.question_count into v_count from public.exams e where e.id = p_exam_id;
  if v_count is null then
    raise exception 'exam unavailable: not_found' using errcode = 'P0002';
  end if;

  select value into v_mix from public.app_config where key = 'exam_difficulty_mix';
  v_mix := coalesce(v_mix, '{"easy": 30, "medium": 45, "hard": 25}'::jsonb);

  with pool as (
    select q.id, q.difficulty
    from public.questions q
    join public.lessons l on l.id = q.lesson_id and l.is_active
    where q.is_active
      and q.is_exam_eligible
      and public.can_access_module(p_user_id, l.module_id)
      and (not q.is_premium or v_premium)
  ),
  -- Shuffled once, then sliced per difficulty: one pass over the pool, and the same row
  -- numbering drives both the quota and the filler.
  ranked as (
    select
      pool.id,
      pool.difficulty,
      row_number() over (partition by pool.difficulty order by random()) as rn
    from pool
  ),
  quota as (
    select r.id
    from ranked r
    where r.rn <= floor(v_count * coalesce((v_mix ->> r.difficulty::text)::numeric, 0) / 100.0)
  ),
  filler as (
    select r.id
    from ranked r
    where not exists (select 1 from quota where quota.id = r.id)
    order by random()
    limit greatest(v_count - (select count(*) from quota), 0)
  )
  -- Shuffled again across buckets, so the paper does not run easy-to-hard and hand this
  -- learner a difficulty curve the next one does not get.
  select array(
    select chosen.id
    from (select id from quota union all select id from filler) chosen
    order by random()
    limit v_count
  )
  into v_chosen;

  if coalesce(array_length(v_chosen, 1), 0) < v_count then
    raise exception 'exam unavailable: pool_too_small' using errcode = '22023';
  end if;

  return v_chosen;
end;
$$;

comment on function public.exam_question_set(uuid, uuid) is
  'Internal: picks and shuffles one attempt''s questions, respecting the difficulty mix.';

/**
 * The questions of an attempt, rendered for the player.
 *
 * Exactly the shape the lesson and practice players already consume — and, like them, with no
 * explanation, no hint text and no answer key. `has_hint` is a boolean, and during an exam the
 * client does not offer the hint at all (SPEC §27: no per-question feedback).
 *
 * Ordered by position in `question_ids`, so the paper is identical across a resume.
 */
create or replace function public.exam_questions(p_attempt_id uuid, p_locale text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(t) order by t.ord), '[]'::jsonb)
  from (
    select
      ids.ord,
      q.id,
      q.type,
      q.difficulty,
      public.localized_text(q.prompt, p_locale) as prompt,
      q.code_snippet,
      public.localize_deep(q.payload, p_locale) as payload,
      (q.hint is not null) as has_hint,
      to_jsonb(q.skill_tags) as skill_tags
    from public.exam_attempts a
    cross join lateral unnest(a.question_ids) with ordinality as ids(question_id, ord)
    join public.questions q on q.id = ids.question_id
    where a.id = p_attempt_id
  ) t;
$$;

-- ---------------------------------------------------------------------------------------
-- 4. Starting an attempt (SPEC §27)
-- ---------------------------------------------------------------------------------------

/**
 * Starts — or resumes — an exam attempt.
 *
 * Resuming rather than restarting is the whole point of the open-attempt index. A learner
 * whose app was killed at question 25 gets their paper back, with the clock where they left it
 * and the answers they had saved. A learner force-quitting because they disliked the questions
 * gets the same paper back — which is the same rule seen from the other side.
 *
 * An open attempt whose clock has run out is submitted first, on the answers that were saved,
 * and then a new one starts if the limits allow. Time running out is a result, not a pause.
 */
create or replace function public.start_exam(p_exam_id uuid, p_locale text default 'en')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
  v_exam public.exams;
  v_open public.exam_attempts;
  v_reason text;
  v_attempt public.exam_attempts;
  v_expires timestamptz;
begin
  select * into v_exam from public.exams where id = p_exam_id;
  if v_exam.id is null or not v_exam.is_active then
    raise exception 'exam unavailable: not_found' using errcode = 'P0002';
  end if;

  select * into v_open
  from public.exam_attempts a
  where a.user_id = v_uid and a.exam_id = p_exam_id and a.submitted_at is null
  order by a.started_at desc
  limit 1;

  -- An expired attempt is finished, not resumed. Grading it here rather than leaving it open
  -- means the learner's next action tells them the truth instead of quietly starting over.
  if v_open.id is not null and v_open.expires_at is not null and v_open.expires_at <= now() then
    perform public.submit_exam(v_open.id, null, p_locale);
    v_open := null;
  end if;

  if v_open.id is not null then
    return jsonb_build_object(
      'attempt_id', v_open.id,
      'exam_id', v_exam.id,
      'resumed', true,
      'title', public.localized_text(v_exam.title, p_locale),
      'question_count', coalesce(array_length(v_open.question_ids, 1), 0),
      'pass_threshold_pct', v_exam.pass_threshold_pct,
      'started_at', v_open.started_at,
      'expires_at', v_open.expires_at,
      'saved_answers', v_open.answers,
      'questions', public.exam_questions(v_open.id, p_locale)
    );
  end if;

  v_reason := public.exam_unavailable_reason(v_uid, p_exam_id);
  if v_reason is not null then
    -- The paywall gets its own code, because it is the one refusal with somewhere to go.
    raise exception 'exam unavailable: %', v_reason
      using errcode = case v_reason
                        when 'requires_premium' then '42501'
                        when 'not_found' then 'P0002'
                        else '22023'
                      end;
  end if;

  if v_exam.time_limit_minutes is not null then
    v_expires := now() + make_interval(mins => v_exam.time_limit_minutes);
  end if;

  insert into public.exam_attempts (user_id, exam_id, question_ids, expires_at)
  values (v_uid, p_exam_id, public.exam_question_set(v_uid, p_exam_id), v_expires)
  returning * into v_attempt;

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'exam_id', v_exam.id,
    'resumed', false,
    'title', public.localized_text(v_exam.title, p_locale),
    'question_count', coalesce(array_length(v_attempt.question_ids, 1), 0),
    'pass_threshold_pct', v_exam.pass_threshold_pct,
    'started_at', v_attempt.started_at,
    'expires_at', v_attempt.expires_at,
    'saved_answers', '{}'::jsonb,
    'questions', public.exam_questions(v_attempt.id, p_locale)
  );
end;
$$;

comment on function public.start_exam(uuid, text) is
  'Starts or resumes an attempt. Freezes the question set; never returns an answer key (SPEC §27).';

/**
 * Saves answers mid-exam.
 *
 * SPEC §27 submits every answer at once, and that has not changed — `submit_exam` still takes
 * the whole payload. What this adds is that a 45-minute exam no longer evaporates when the app
 * is killed, which would be the single worst experience in the product (SPEC §36: a failed
 * submit must never lose the learner's work). `exam_attempts.answers` already exists for it,
 * and the merge is idempotent, so the client can call it on every question change.
 *
 * It is also what makes the time limit enforceable without being cruel: when a submission
 * arrives past the grace period, these are the answers that get marked.
 */
create or replace function public.save_exam_progress(p_attempt_id uuid, p_answers jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
begin
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'answers must be an object' using errcode = '22023';
  end if;

  update public.exam_attempts a
  set answers = a.answers || p_answers
  where a.id = p_attempt_id
    and a.user_id = v_uid
    and a.submitted_at is null;

  -- Deliberately silent on a missing or already-graded attempt. This is a background save;
  -- an error toast over a results screen would be noise about something already handled.
end;
$$;

comment on function public.save_exam_progress(uuid, jsonb) is
  'Merges answers into an open attempt so a crash does not cost 45 minutes (SPEC §27, §36).';

-- ---------------------------------------------------------------------------------------
-- 5. The results page (SPEC §27, §28)
-- ---------------------------------------------------------------------------------------

/**
 * The results for a graded attempt.
 *
 * Separate from `submit_exam` so that reopening an old result — from Progress, or after the
 * app died on the results screen — reads the same page without regrading or repaying anything.
 *
 * Everything hidden during the exam arrives here: the verdict per question, the explanation
 * and the correct answer. That is the moment the key stops being secret (SPEC §16) — for these
 * questions, for this learner, after they have committed to an answer.
 */
create or replace function public.exam_results(
  p_attempt_id uuid,
  p_locale text default 'en',
  p_xp_awarded integer default 0,
  p_unlocked jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
  v_attempt public.exam_attempts;
  v_exam public.exams;
  v_review jsonb;
begin
  select * into v_attempt from public.exam_attempts a where a.id = p_attempt_id;

  -- Somebody else's attempt is reported as missing rather than forbidden: "wrong owner" would
  -- confirm that the id exists.
  if v_attempt.id is null or v_attempt.user_id <> v_uid or v_attempt.submitted_at is null then
    raise exception 'attempt not found' using errcode = 'P0002';
  end if;

  select * into v_exam from public.exams e where e.id = v_attempt.exam_id;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.ord), '[]'::jsonb) into v_review
  from (
    select
      ids.ord,
      q.id,
      q.type,
      q.difficulty,
      public.localized_text(q.prompt, p_locale) as prompt,
      q.code_snippet,
      public.localize_deep(q.payload, p_locale) as payload,
      to_jsonb(q.skill_tags) as skill_tags,
      v_attempt.answers -> q.id::text as submitted_answer,
      coalesce(public.grade_answer(q.id, v_attempt.answers -> q.id::text), false) as is_correct,
      public.localized_text(q.explanation, p_locale) as explanation,
      k.answer as correct_answer
    from unnest(v_attempt.question_ids) with ordinality as ids(question_id, ord)
    join public.questions q on q.id = ids.question_id
    left join public.question_answer_keys k on k.question_id = q.id
  ) t;

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'exam_id', v_exam.id,
    'title', public.localized_text(v_exam.title, p_locale),
    'score_pct', v_attempt.score_pct,
    'passed', v_attempt.passed,
    'pass_threshold_pct', v_exam.pass_threshold_pct,
    'correct_count', (
      select count(*) from jsonb_array_elements(v_review) r
      where (r ->> 'is_correct')::boolean
    ),
    'question_count', coalesce(array_length(v_attempt.question_ids, 1), 0),
    'skill_breakdown', v_attempt.skill_breakdown,
    'started_at', v_attempt.started_at,
    'submitted_at', v_attempt.submitted_at,
    'xp_awarded', coalesce(p_xp_awarded, 0),
    'unlocked', coalesce(p_unlocked, '[]'::jsonb),
    'questions', v_review
  );
end;
$$;

comment on function public.exam_results(uuid, text, integer, jsonb) is
  'Internal: the results page for a graded attempt (SPEC §27, §28).';

/**
 * The client-facing reader.
 *
 * `exam_results` takes the XP and the unlocked achievements as arguments because `submit_exam`
 * has just computed them. A client must not be able to pass its own — hence this two-argument
 * wrapper, which is the only version granted.
 */
create or replace function public.get_exam_results(p_attempt_id uuid, p_locale text default 'en')
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.exam_results(p_attempt_id, p_locale, 0, '[]'::jsonb);
$$;

comment on function public.get_exam_results(uuid, text) is
  'Reopens a graded attempt''s results. XP is reported as 0 — it was paid at submission.';

-- ---------------------------------------------------------------------------------------
-- 6. Submitting (SPEC §27, §19)
-- ---------------------------------------------------------------------------------------

/**
 * Grades an attempt.
 *
 * Idempotent: a resubmitted attempt returns the same page and pays nothing more, because
 * `submitted_at` is checked first and the XP goes through the ledger keyed on the attempt id.
 *
 * `p_answers` is null when the server submits on the learner's behalf — an expired attempt
 * found by `start_exam`.
 */
create or replace function public.submit_exam(
  p_attempt_id uuid,
  p_answers jsonb default null,
  p_locale text default 'en'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
  v_attempt public.exam_attempts;
  v_exam public.exams;
  v_answers jsonb;
  v_results jsonb := '{}'::jsonb;
  v_grace integer := public.config_int('exam_submit_grace_seconds', 60);
  v_late boolean := false;
  v_correct integer := 0;
  v_total integer;
  v_score numeric(5, 2);
  v_passed boolean;
  v_skills jsonb;
  v_earned integer;
  v_best integer;
  v_awarded integer := 0;
  v_unlocked jsonb;
  v_question_id uuid;
  v_submitted jsonb;
  v_is_correct boolean;
  v_attempt_no integer;
begin
  select * into v_attempt from public.exam_attempts a where a.id = p_attempt_id;

  if v_attempt.id is null or v_attempt.user_id <> v_uid then
    raise exception 'attempt not found' using errcode = 'P0002';
  end if;

  -- Already graded: hand back the same page rather than regrading or paying twice.
  if v_attempt.submitted_at is not null then
    return public.exam_results(v_attempt.id, p_locale, 0, '[]'::jsonb);
  end if;

  select * into v_exam from public.exams e where e.id = v_attempt.exam_id;

  v_late := v_attempt.expires_at is not null
        and now() > v_attempt.expires_at + make_interval(secs => v_grace);

  -- Inside the grace, the payload counts. Past it the clock has decided: what was saved when
  -- time ran out is what gets marked, and a late payload is ignored rather than the whole
  -- submission rejected — rejecting would throw away work the learner genuinely did.
  if v_late or p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    v_answers := v_attempt.answers;
  else
    v_answers := v_attempt.answers || p_answers;
  end if;

  v_total := coalesce(array_length(v_attempt.question_ids, 1), 0);

  foreach v_question_id in array v_attempt.question_ids loop
    v_submitted := v_answers -> v_question_id::text;

    -- An unanswered question is wrong. `grade_answer` never raises on malformed input, so a
    -- client sending nonsense scores zero rather than breaking the whole submission.
    v_is_correct := coalesce(public.grade_answer(v_question_id, v_submitted), false);
    v_results := v_results || jsonb_build_object(v_question_id::text, v_is_correct);

    if v_is_correct then
      v_correct := v_correct + 1;
    end if;

    select coalesce(max(a.attempt_no), 0) + 1 into v_attempt_no
    from public.user_question_attempts a
    where a.user_id = v_uid and a.question_id = v_question_id;

    -- Recorded like any other answer, so exam mistakes reach the review set and per-skill
    -- accuracy (SPEC §23, §28). No question XP: an exam pays on the score, once.
    insert into public.user_question_attempts
      (user_id, question_id, context, is_correct, attempt_no, submitted_answer)
    values (v_uid, v_question_id, 'exam', v_is_correct, v_attempt_no, v_submitted);
  end loop;

  v_score := case when v_total = 0 then 0 else round(v_correct * 100.0 / v_total, 2) end;
  v_passed := v_score >= v_exam.pass_threshold_pct;

  -- Weak areas, from the skill tags of the questions on THIS paper (SPEC §27, §28). Graded
  -- once, in the loop above, and read back from `v_results` rather than re-graded per tag.
  select coalesce(jsonb_object_agg(s.tag, s.pct), '{}'::jsonb) into v_skills
  from (
    select
      tags.tag,
      round(
        count(*) filter (where (v_results ->> q.id::text)::boolean) * 100.0 / count(*), 0
      )::integer as pct
    from unnest(v_attempt.question_ids) as ids(question_id)
    join public.questions q on q.id = ids.question_id
    cross join lateral unnest(q.skill_tags) as tags(tag)
    group by tags.tag
  ) s;

  update public.exam_attempts a
  set answers = v_answers,
      score_pct = v_score,
      passed = v_passed,
      skill_breakdown = v_skills,
      submitted_at = now()
  where a.id = v_attempt.id;

  -- XP on the score, as the IMPROVEMENT over the learner's best exam result so far (SPEC §19).
  -- Because every exam award is itself an improvement, the running total of `exam` ledger rows
  -- IS that best — there is no separate high-score column to keep in step.
  v_earned := round(v_score / 100.0 * public.config_int('exam_xp_max', 100))::integer;

  select coalesce(sum(e.amount), 0)::integer into v_best
  from public.xp_events e
  where e.user_id = v_uid and e.source_type = 'exam';

  if v_earned > v_best then
    v_awarded := public.award_xp(v_uid, 'exam', v_attempt.id::text, v_earned - v_best);
  end if;

  -- An exam is a serious amount of answering; it counts towards the day (SPEC §21).
  perform public.touch_daily_activity(v_uid, 0, v_total, v_awarded);
  perform public.evaluate_streak(v_uid);

  v_unlocked := public.evaluate_achievements(
    v_uid, array['exams_completed', 'exam_passed', 'xp_total']
  );

  return public.exam_results(v_attempt.id, p_locale, v_awarded, v_unlocked);
end;
$$;

comment on function public.submit_exam(uuid, jsonb, text) is
  'Grades an attempt server-side, enforces the time limit, pays score XP as the improvement '
  'over the learner''s best, and returns the results page (SPEC §19, §27).';

-- ---------------------------------------------------------------------------------------
-- 7. The exam list (SPEC §27)
-- ---------------------------------------------------------------------------------------

/**
 * Every active exam, with this learner's state for each.
 *
 * One round trip for the whole screen, carrying the same refusal codes `start_exam` would
 * raise — so an exam that cannot be started is greyed out with the reason already in hand,
 * rather than letting the learner tap and be told no.
 */
create or replace function public.get_exam_overview(p_locale text default 'en')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
begin
  return jsonb_build_object(
    'enabled', public.config_bool('exams_enabled', true),
    'best_xp', (
      select coalesce(sum(e.amount), 0)::integer
      from public.xp_events e
      where e.user_id = v_uid and e.source_type = 'exam'
    ),
    'exams', (
      select coalesce(jsonb_agg(to_jsonb(t) order by t.question_count), '[]'::jsonb)
      from (
        select
          e.id,
          e.slug,
          public.localized_text(e.title, p_locale) as title,
          public.localized_text(e.description, p_locale) as description,
          e.question_count,
          e.time_limit_minutes,
          e.pass_threshold_pct,
          e.requires_entitlement is not null as requires_premium,
          public.exam_unavailable_reason(v_uid, e.id) as unavailable_reason,
          (
            select a.id from public.exam_attempts a
            where a.user_id = v_uid and a.exam_id = e.id and a.submitted_at is null
              and (a.expires_at is null or a.expires_at > now())
            order by a.started_at desc limit 1
          ) as open_attempt_id,
          (
            select max(a.score_pct) from public.exam_attempts a
            where a.user_id = v_uid and a.exam_id = e.id and a.submitted_at is not null
          ) as best_score_pct,
          (
            select count(*)::integer from public.exam_attempts a
            where a.user_id = v_uid and a.exam_id = e.id and a.submitted_at is not null
          ) as attempts_taken,
          coalesce((
            select bool_or(a.passed) from public.exam_attempts a
            where a.user_id = v_uid and a.exam_id = e.id and a.submitted_at is not null
          ), false) as ever_passed
        from public.exams e
        where e.is_active
      ) t
    )
  );
end;
$$;

comment on function public.get_exam_overview(text) is
  'The exam list with each exam''s availability, best score and open attempt (SPEC §27).';

-- ---------------------------------------------------------------------------------------
-- 8. Grants (SPEC §40 — default deny, then hand back exactly what the app calls)
-- ---------------------------------------------------------------------------------------

revoke all on function public.config_bool(text, boolean) from public, anon, authenticated;
revoke all on function public.exam_unavailable_reason(uuid, uuid) from public, anon, authenticated;
revoke all on function public.exam_question_set(uuid, uuid) from public, anon, authenticated;
revoke all on function public.exam_questions(uuid, text) from public, anon, authenticated;
revoke all on function public.exam_results(uuid, text, integer, jsonb) from public, anon, authenticated;
revoke all on function public.start_exam(uuid, text) from public, anon, authenticated;
revoke all on function public.save_exam_progress(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.submit_exam(uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.get_exam_results(uuid, text) from public, anon, authenticated;
revoke all on function public.get_exam_overview(text) from public, anon, authenticated;

grant execute on function public.start_exam(uuid, text) to authenticated;
grant execute on function public.save_exam_progress(uuid, jsonb) to authenticated;
grant execute on function public.submit_exam(uuid, jsonb, text) to authenticated;
grant execute on function public.get_exam_results(uuid, text) to authenticated;
grant execute on function public.get_exam_overview(text) to authenticated;

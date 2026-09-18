-- CodeSprint — Home, Practice and the Daily Challenge (SPEC §13, §23, §24, Phase 11).
--
-- Three things the learner opens the app FOR, rather than three more places to answer
-- questions. Home has to answer "what do I do now" in one glance; Practice has to make a
-- wrong answer worth returning to; the Daily Challenge has to be there every single day,
-- without anyone scheduling one.

-- ---------------------------------------------------------------------------------------
-- 1. Practice XP (SPEC §19, §23)
-- ---------------------------------------------------------------------------------------
--
-- Two XP a correct answer, capped at forty a day, so practice cannot be farmed. The cap is
-- per LOCAL day, like everything else that resets (SPEC §21).

create or replace function public.practice_xp_today(p_user_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_timezone text;
begin
  select p.timezone into v_timezone from public.profiles p where p.id = p_user_id;

  return coalesce((
    select sum(e.amount)::integer
    from public.xp_events e
    where e.user_id = p_user_id
      and e.source_type = 'practice'
      and public.local_date_for(coalesce(v_timezone, 'UTC'), e.created_at)
          = public.local_date_for(coalesce(v_timezone, 'UTC'))
  ), 0);
end;
$$;

comment on function public.practice_xp_today(uuid) is
  'Internal: practice XP earned on the user''s current local day, for the daily cap.';

/**
 * XP for one correct practice answer, honouring the daily cap.
 *
 * The cap TRUNCATES rather than refusing: a learner one point from the cap gets that one
 * point, not nothing. The ledger key includes the date, so the same question can be practised
 * again tomorrow — unlike the lesson reward, which is once per question forever (SPEC §19).
 */
create or replace function public.award_practice_xp(p_user_id uuid, p_question_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timezone text;
  v_today date;
  v_cap integer := public.config_int('xp_practice_daily_cap', 40);
  v_amount integer := public.config_int('xp_practice_correct', 2);
  v_earned integer;
begin
  v_earned := public.practice_xp_today(p_user_id);
  if v_earned >= v_cap then
    return 0;
  end if;

  v_amount := least(v_amount, v_cap - v_earned);

  select p.timezone into v_timezone from public.profiles p where p.id = p_user_id;
  v_today := public.local_date_for(coalesce(v_timezone, 'UTC'));

  return public.award_xp(
    p_user_id, 'practice', p_question_id::text || ':' || v_today::text, v_amount
  );
end;
$$;

comment on function public.award_practice_xp(uuid, uuid) is
  'Pays for a correct practice answer up to the daily cap (SPEC §19, §23).';

-- ---------------------------------------------------------------------------------------
-- 2. Practice sets (SPEC §23)
-- ---------------------------------------------------------------------------------------
--
-- Three modes, one function. Each returns renderable questions — the same shape `get_lesson`
-- produces, and with the same omissions: no explanation, no hint, no answer key.

create or replace function public.get_practice_set(
  p_mode text default 'review',
  p_size integer default 10,
  p_locale text default 'en'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
  v_premium boolean := public.has_entitlement(v_uid, 'premium');
  v_size integer := least(greatest(coalesce(p_size, 10), 1), 20);
  v_questions jsonb;
begin
  if p_mode not in ('review', 'mixed', 'hard') then
    raise exception 'unknown practice mode: %', p_mode using errcode = '22023';
  end if;

  -- Hard sets are Premium (SPEC §23). Checked here, so a free client cannot ask for one.
  if p_mode = 'hard' and not v_premium then
    raise exception 'hard practice requires premium' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into v_questions
  from (
    select
      q.id,
      q.type,
      q.difficulty,
      public.localized_text(q.prompt, p_locale) as prompt,
      q.code_snippet,
      public.localize_deep(q.payload, p_locale) as payload,
      (q.hint is not null) as has_hint,
      to_jsonb(q.skill_tags) as skill_tags
    from public.questions q
    join public.lessons l on l.id = q.lesson_id and l.is_active
    where q.is_active
      -- Never offer a question from a module the learner cannot open, and never a Premium
      -- question to a free learner: practice must not become a paywall bypass.
      and public.can_access_module(v_uid, l.module_id)
      and (not q.is_premium or v_premium)
      and case p_mode
        -- Review: answered wrong and never since answered right (SPEC §23).
        when 'review' then
          exists (
            select 1 from public.user_question_attempts a
            where a.user_id = v_uid and a.question_id = q.id and not a.is_correct
          )
          and not exists (
            select 1 from public.user_question_attempts a
            where a.user_id = v_uid and a.question_id = q.id and a.is_correct
          )
        -- Mixed: anything from a lesson already completed.
        when 'mixed' then
          exists (
            select 1 from public.user_lesson_progress p
            where p.user_id = v_uid and p.lesson_id = q.lesson_id and p.completed_at is not null
          )
        -- Hard: the difficult questions of completed lessons.
        else
          q.difficulty = 'hard'
          and exists (
            select 1 from public.user_lesson_progress p
            where p.user_id = v_uid and p.lesson_id = q.lesson_id and p.completed_at is not null
          )
      end
    order by random()
    limit v_size
  ) t;

  return jsonb_build_object('mode', p_mode, 'questions', v_questions);
end;
$$;

comment on function public.get_practice_set(text, integer, text) is
  'A practice set: review mistakes, mixed, or hard (Premium). Never returns answers (SPEC §23).';

/** How many questions are waiting to be reviewed — the badge on the Home CTA. */
create or replace function public.mistake_count(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.questions q
  join public.lessons l on l.id = q.lesson_id and l.is_active
  where q.is_active
    and public.can_access_module(p_user_id, l.module_id)
    and exists (
      select 1 from public.user_question_attempts a
      where a.user_id = p_user_id and a.question_id = q.id and not a.is_correct
    )
    and not exists (
      select 1 from public.user_question_attempts a
      where a.user_id = p_user_id and a.question_id = q.id and a.is_correct
    );
$$;

-- ---------------------------------------------------------------------------------------
-- 3. The Daily Challenge (SPEC §24)
-- ---------------------------------------------------------------------------------------

/**
 * Today's challenge questions.
 *
 * A scheduled row wins if one exists. Otherwise the questions are chosen DETERMINISTICALLY
 * from the challenge-eligible pool using a hash of the date, so there is always a challenge
 * and everyone on the same local date sees the same one — without anybody scheduling it.
 *
 * `md5(date || question id)` gives a stable pseudo-random ordering: the same date always
 * produces the same set, and a different date produces a different one.
 */
create or replace function public.daily_challenge_questions(p_user_id uuid, p_date date)
returns uuid[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_scheduled uuid[];
  v_premium boolean := public.has_entitlement(p_user_id, 'premium');
begin
  select c.question_ids into v_scheduled
  from public.daily_challenges c
  where c.challenge_date = p_date;

  if v_scheduled is not null and array_length(v_scheduled, 1) > 0 then
    return v_scheduled;
  end if;

  return array(
    select q.id
    from public.questions q
    join public.lessons l on l.id = q.lesson_id and l.is_active
    where q.is_active
      and q.is_challenge_eligible
      -- Free learners get non-Premium questions only (SPEC §24).
      and (not q.is_premium or v_premium)
      and not public.module_requires_premium(l.module_id)
    order by md5(p_date::text || q.id::text)
    limit 3
  );
end;
$$;

comment on function public.daily_challenge_questions(uuid, date) is
  'Today''s challenge: a scheduled row if there is one, otherwise a deterministic pick (SPEC §24).';

create or replace function public.get_daily_challenge(p_locale text default 'en')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
  v_timezone text;
  v_today date;
  v_ids uuid[];
  v_claim public.user_daily_challenge_claims;
  v_questions jsonb;
  v_bonus integer;
begin
  select p.timezone into v_timezone from public.profiles p where p.id = v_uid;
  v_today := public.local_date_for(coalesce(v_timezone, 'UTC'));

  v_ids := public.daily_challenge_questions(v_uid, v_today);

  select c.* into v_claim
  from public.user_daily_challenge_claims c
  where c.user_id = v_uid and c.local_date = v_today;

  select coalesce(c.bonus_xp, public.config_int('xp_daily_challenge', 25)) into v_bonus
  from public.daily_challenges c
  where c.challenge_date = v_today;

  v_bonus := coalesce(v_bonus, public.config_int('xp_daily_challenge', 25));

  select coalesce(jsonb_agg(row_to_json(t) order by t.ord), '[]'::jsonb)
  into v_questions
  from (
    select
      ord,
      q.id,
      q.type,
      q.difficulty,
      public.localized_text(q.prompt, p_locale) as prompt,
      q.code_snippet,
      public.localize_deep(q.payload, p_locale) as payload,
      (q.hint is not null) as has_hint,
      to_jsonb(q.skill_tags) as skill_tags
    from unnest(v_ids) with ordinality as ids(question_id, ord)
    join public.questions q on q.id = ids.question_id and q.is_active
  ) t;

  return jsonb_build_object(
    'date', v_today,
    'bonus_xp', v_bonus,
    'claimed', v_claim.user_id is not null,
    'xp_awarded', coalesce(v_claim.xp_awarded, 0),
    'questions', v_questions
  );
end;
$$;

comment on function public.get_daily_challenge(text) is
  'Today''s Daily Challenge with its claim state (SPEC §24).';

/**
 * Claims the day's bonus, once.
 *
 * The primary key on (user_id, local_date) makes "once per day" structural rather than
 * procedural: a replayed request inserts nothing and pays nothing, and no caller has to
 * remember to check first (SPEC §24).
 */
create or replace function public.claim_daily_challenge()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
  v_timezone text;
  v_today date;
  v_ids uuid[];
  v_answered integer;
  v_xp integer := 0;
  v_bonus integer;
  v_inserted boolean := false;
  v_unlocked jsonb := '[]'::jsonb;
begin
  select p.timezone into v_timezone from public.profiles p where p.id = v_uid;
  v_today := public.local_date_for(coalesce(v_timezone, 'UTC'));

  v_ids := public.daily_challenge_questions(v_uid, v_today);
  if array_length(v_ids, 1) is null then
    raise exception 'no challenge available today' using errcode = 'P0002';
  end if;

  -- Every question must actually have been answered today. Without this the client could
  -- claim the bonus by opening the card and closing it.
  select count(distinct a.question_id) into v_answered
  from public.user_question_attempts a
  where a.user_id = v_uid
    and a.question_id = any (v_ids)
    and a.context = 'challenge'
    and public.local_date_for(coalesce(v_timezone, 'UTC'), a.created_at) = v_today;

  if v_answered < array_length(v_ids, 1) then
    raise exception 'the challenge is not finished yet' using errcode = '22023';
  end if;

  select coalesce(c.bonus_xp, public.config_int('xp_daily_challenge', 25)) into v_bonus
  from public.daily_challenges c
  where c.challenge_date = v_today;
  v_bonus := coalesce(v_bonus, public.config_int('xp_daily_challenge', 25));

  insert into public.user_daily_challenge_claims (user_id, local_date, xp_awarded, question_ids)
  values (v_uid, v_today, v_bonus, v_ids)
  on conflict (user_id, local_date) do nothing;

  v_inserted := found;

  if v_inserted then
    v_xp := public.award_xp(v_uid, 'challenge', v_today::text, v_bonus);
    perform public.touch_daily_activity(v_uid, 0, 0, v_xp);
    v_unlocked := public.evaluate_achievements(v_uid, array['xp_total', 'streak_days']);
  end if;

  return jsonb_build_object(
    'date', v_today,
    'xp_awarded', v_xp,
    'already_claimed', not v_inserted,
    'current_streak', public.evaluate_streak(v_uid),
    'unlocked', v_unlocked
  );
end;
$$;

comment on function public.claim_daily_challenge() is
  'Pays the Daily Challenge bonus once per local date (SPEC §24).';

-- ---------------------------------------------------------------------------------------
-- 4. Practice XP wired into submit_answer
-- ---------------------------------------------------------------------------------------
--
-- Replaced (never edited) for the fourth time. Only the XP branch changes: a correct answer
-- in practice or challenge context now pays by its own rule rather than nothing.

create or replace function public.submit_answer(
  p_question_id uuid,
  p_answer jsonb,
  p_context public.answer_context default 'lesson',
  p_locale text default 'en'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
  v_question public.questions;
  v_module_id uuid;
  v_attempt_no integer;
  v_correct boolean;
  v_xp integer := 0;
  v_key public.question_answer_keys;
  v_lives jsonb;
  v_streak integer;
  v_unlocked jsonb;
begin
  if p_answer is null or jsonb_typeof(p_answer) <> 'object' then
    raise exception 'answer must be a JSON object' using errcode = '22023';
  end if;

  select q.* into v_question
  from public.questions q
  where q.id = p_question_id and q.is_active;

  if v_question.id is null then
    raise exception 'question not found' using errcode = 'P0002';
  end if;

  select l.module_id into v_module_id
  from public.lessons l
  where l.id = v_question.lesson_id and l.is_active;

  if v_module_id is null then
    raise exception 'question not found' using errcode = 'P0002';
  end if;

  if not public.can_access_module(v_uid, v_module_id)
     or (v_question.is_premium and not public.has_entitlement(v_uid, 'premium')) then
    raise exception 'this question requires premium' using errcode = '42501';
  end if;

  select count(*) + 1 into v_attempt_no
  from public.user_question_attempts a
  where a.user_id = v_uid and a.question_id = p_question_id;

  v_correct := public.grade_answer(p_question_id, p_answer);

  insert into public.user_question_attempts
    (user_id, question_id, context, is_correct, attempt_no, submitted_answer)
  values
    (v_uid, p_question_id, p_context, v_correct, v_attempt_no, p_answer);

  if v_correct then
    case p_context
      when 'lesson' then
        v_xp := public.award_xp(
          v_uid, 'question', p_question_id::text, public.question_xp(p_question_id, v_attempt_no)
        );
      when 'practice' then
        v_xp := public.award_practice_xp(v_uid, p_question_id);
      else
        -- The Daily Challenge pays its bonus on claim, not per question (SPEC §24), and an
        -- exam pays on submission (SPEC §27).
        v_xp := 0;
    end case;
  end if;

  update public.user_stats
  set questions_answered = questions_answered + 1,
      questions_correct = questions_correct + (case when v_correct then 1 else 0 end)
  where user_id = v_uid;

  perform public.touch_daily_activity(v_uid, 0, 1, v_xp);

  if not v_correct then
    perform public.consume_life(v_uid, p_context);
  end if;
  v_lives := public.lives_state(v_uid);

  v_streak := public.evaluate_streak(v_uid);
  v_unlocked := public.evaluate_achievements(
    v_uid, array['questions_answered', 'xp_total', 'streak_days']
  );

  select k.* into v_key
  from public.question_answer_keys k
  where k.question_id = p_question_id;

  return jsonb_build_object(
    'correct', v_correct,
    'attempt_no', v_attempt_no,
    'xp_awarded', v_xp,
    'explanation', public.localized_text(v_question.explanation, p_locale),
    'hint', case
      when v_question.hint is null then null
      else public.localized_text(v_question.hint, p_locale)
    end,
    'solution', v_key.answer,
    'lives', v_lives,
    'current_streak', v_streak,
    'unlocked', v_unlocked
  );
end;
$$;

-- ---------------------------------------------------------------------------------------
-- 5. Home (SPEC §13)
-- ---------------------------------------------------------------------------------------
--
-- Everything the screen needs in ONE round trip. Home is the most-opened screen in the
-- product, and five parallel requests on a cold mobile connection is five chances to show a
-- spinner where an answer should be.

create or replace function public.get_home_summary(p_locale text default 'en')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
  v_stats public.user_stats;
  v_profile public.profiles;
  v_today date;
  v_goal_xp integer;
  v_earned integer;
  v_next jsonb;
  v_lives jsonb := public.lives_state(v_uid);
  v_claimed boolean;
  v_course jsonb;
begin
  select s.* into v_stats from public.user_stats s where s.user_id = v_uid;
  select p.* into v_profile from public.profiles p where p.id = v_uid;

  v_today := public.local_date_for(coalesce(v_profile.timezone, 'UTC'));

  -- The daily goal is an XP target derived from the chosen minutes; minutes are never
  -- measured (SPEC §11).
  select coalesce(
    (value -> (coalesce(v_profile.daily_goal_minutes, 5))::text)::integer,
    30
  )
  into v_goal_xp
  from public.app_config where key = 'daily_goal_xp';

  select coalesce(d.xp_earned, 0) into v_earned
  from public.user_daily_activity d
  where d.user_id = v_uid and d.local_date = v_today;

  -- The next lesson: the first uncompleted one in module order, then lesson order. A learner
  -- who has finished everything available gets null and the screen says so.
  select to_jsonb(t) into v_next
  from (
    select
      l.id,
      l.slug,
      public.localized_text(l.title, p_locale) as title,
      l.estimated_minutes,
      m.id as module_id,
      public.localized_text(m.title, p_locale) as module_title,
      m.order_index as module_order,
      l.order_index as lesson_order
    from public.lessons l
    join public.modules m on m.id = l.module_id
    where l.is_active and m.is_active
      and public.can_access_module(v_uid, m.id)
      and not exists (
        select 1 from public.user_lesson_progress p
        where p.user_id = v_uid and p.lesson_id = l.id and p.completed_at is not null
      )
    order by m.order_index, l.order_index
    limit 1
  ) t;

  select (c.user_id is not null) into v_claimed
  from public.user_daily_challenge_claims c
  where c.user_id = v_uid and c.local_date = v_today;

  select jsonb_build_object(
    'total', count(*),
    'completed', count(*) filter (
      where exists (
        select 1 from public.user_lesson_progress p
        where p.user_id = v_uid and p.lesson_id = l.id and p.completed_at is not null
      )
    )
  )
  into v_course
  from public.lessons l
  join public.modules m on m.id = l.module_id
  where l.is_active and m.is_active and public.can_access_module(v_uid, m.id);

  return jsonb_build_object(
    'xp_total', coalesce(v_stats.xp_total, 0),
    'current_streak', public.current_streak_for(v_uid),
    'lives', v_lives,
    'daily_goal', jsonb_build_object(
      'target_xp', v_goal_xp,
      'earned_xp', coalesce(v_earned, 0),
      'met', coalesce(v_earned, 0) >= v_goal_xp
    ),
    'next_lesson', v_next,
    'course', v_course,
    'mistake_count', public.mistake_count(v_uid),
    'challenge', jsonb_build_object(
      'claimed', coalesce(v_claimed, false),
      'bonus_xp', public.config_int('xp_daily_challenge', 25)
    ),
    -- A brand-new learner gets the welcoming state rather than a wall of zeroes (SPEC §13).
    'is_new', coalesce(v_stats.lessons_completed, 0) = 0
  );
end;
$$;

comment on function public.get_home_summary(text) is
  'Everything the Home screen needs, in one round trip (SPEC §13, §45).';

-- ---------------------------------------------------------------------------------------
-- 6. Grants (SPEC §40, default-deny)
-- ---------------------------------------------------------------------------------------

revoke all on function public.practice_xp_today(uuid) from public, anon, authenticated;
revoke all on function public.award_practice_xp(uuid, uuid) from public, anon, authenticated;
revoke all on function public.mistake_count(uuid) from public, anon, authenticated;
revoke all on function public.daily_challenge_questions(uuid, date) from public, anon, authenticated;
revoke all on function public.get_practice_set(text, integer, text) from public, anon, authenticated;
revoke all on function public.get_daily_challenge(text) from public, anon, authenticated;
revoke all on function public.claim_daily_challenge() from public, anon, authenticated;
revoke all on function public.get_home_summary(text) from public, anon, authenticated;

grant execute on function public.get_practice_set(text, integer, text) to authenticated;
grant execute on function public.get_daily_challenge(text) to authenticated;
grant execute on function public.claim_daily_challenge() to authenticated;
grant execute on function public.get_home_summary(text) to authenticated;

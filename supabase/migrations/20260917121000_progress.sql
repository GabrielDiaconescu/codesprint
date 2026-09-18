-- CodeSprint — XP totals, lesson completion and the progress summary (SPEC §19, §20, §28,
-- Phase 9).
--
-- Phase 8 made a question pay. This phase makes a LESSON pay, and makes everything the
-- learner has done visible.
--
-- The counters on `user_stats` and `user_daily_activity` are denormalised: the ledger and the
-- attempts table remain the source of truth, and these exist so Home and Progress do not
-- aggregate the whole history on every open (SPEC §45). They are therefore only ever written
-- inside the same transaction as the thing they count.

-- ---------------------------------------------------------------------------------------
-- Daily activity roll-up (SPEC §21, §28)
-- ---------------------------------------------------------------------------------------
--
-- Keyed on the user's LOCAL date, not UTC: a session at 23:30 in Bucharest belongs to that
-- day, not to tomorrow. Phase 10 reads `qualified` to decide whether a day extends a streak;
-- this phase only records what happened.

create or replace function public.touch_daily_activity(
  p_user_id uuid,
  p_lessons integer default 0,
  p_questions integer default 0,
  p_xp integer default 0
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timezone text;
  v_date date;
begin
  select p.timezone into v_timezone from public.profiles p where p.id = p_user_id;
  v_date := public.local_date_for(coalesce(v_timezone, 'UTC'));

  insert into public.user_daily_activity
    (user_id, local_date, lessons_completed, questions_answered, xp_earned)
  values (p_user_id, v_date, p_lessons, p_questions, p_xp)
  on conflict (user_id, local_date) do update set
    lessons_completed = public.user_daily_activity.lessons_completed + excluded.lessons_completed,
    questions_answered = public.user_daily_activity.questions_answered + excluded.questions_answered,
    xp_earned = public.user_daily_activity.xp_earned + excluded.xp_earned,
    updated_at = now();
end;
$$;

comment on function public.touch_daily_activity(uuid, integer, integer, integer) is
  'Internal: accumulates one day''s activity, keyed on the user''s local date (SPEC §21).';

-- ---------------------------------------------------------------------------------------
-- submit_answer, now counting
-- ---------------------------------------------------------------------------------------
--
-- Replaced rather than edited (SPEC §59.28). The grading, XP and access rules are unchanged;
-- what is new is that every attempt now moves the counters Progress reads.
--
-- `questions_answered` counts ATTEMPTS, not distinct questions, so accuracy means what it
-- says: answer one question wrong then right and you have answered twice and been right once.

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

  if v_correct and p_context = 'lesson' then
    v_xp := public.award_xp(
      v_uid, 'question', p_question_id::text, public.question_xp(p_question_id, v_attempt_no)
    );
  end if;

  update public.user_stats
  set questions_answered = questions_answered + 1,
      questions_correct = questions_correct + (case when v_correct then 1 else 0 end)
  where user_id = v_uid;

  perform public.touch_daily_activity(v_uid, 0, 1, v_xp);

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
    'solution', v_key.answer
  );
end;
$$;

-- ---------------------------------------------------------------------------------------
-- complete_lesson (SPEC §19, §25)
-- ---------------------------------------------------------------------------------------
--
-- Called when the learner reaches the end of a lesson. Idempotent in the way that matters:
-- `award_xp` refuses a second payment for the same lesson, and the completion timestamp and
-- the lessons_completed counter only move on the FIRST completion. Re-reading a lesson is
-- something we want to encourage, not something to pay for twice.
--
-- "Perfect" means every question in the lesson was answered correctly on the first attempt
-- (SPEC §25). It is computed from the attempts table rather than trusted from the client,
-- and it is recomputed on every completion so a later perfect run can earn it.

create or replace function public.complete_lesson(p_lesson_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
  v_module_id uuid;
  v_total integer;
  v_correct integer;
  v_first_try integer;
  v_perfect boolean;
  v_xp integer := 0;
  v_already boolean;
begin
  select l.module_id into v_module_id
  from public.lessons l
  where l.id = p_lesson_id and l.is_active;

  if v_module_id is null then
    raise exception 'lesson not found' using errcode = 'P0002';
  end if;

  if not public.can_access_module(v_uid, v_module_id) then
    raise exception 'this module requires premium' using errcode = '42501';
  end if;

  select count(*) into v_total
  from public.questions q
  where q.lesson_id = p_lesson_id and q.is_active;

  -- Distinct questions ever answered correctly, and those right on the first attempt.
  select
    count(distinct a.question_id) filter (where a.is_correct),
    count(distinct a.question_id) filter (where a.is_correct and a.attempt_no = 1)
  into v_correct, v_first_try
  from public.user_question_attempts a
  join public.questions q on q.id = a.question_id
  where a.user_id = v_uid and q.lesson_id = p_lesson_id and q.is_active;

  v_perfect := v_total > 0 and v_first_try = v_total;

  select (p.completed_at is not null) into v_already
  from public.user_lesson_progress p
  where p.user_id = v_uid and p.lesson_id = p_lesson_id;

  insert into public.user_lesson_progress
    (user_id, lesson_id, status, questions_correct, questions_total, is_perfect, completed_at)
  values
    (v_uid, p_lesson_id, 'completed', coalesce(v_correct, 0), v_total, v_perfect, now())
  on conflict (user_id, lesson_id) do update set
    status = 'completed',
    questions_correct = excluded.questions_correct,
    questions_total = excluded.questions_total,
    -- Once earned, perfect is kept: a later re-read with a wrong answer must not revoke it.
    is_perfect = public.user_lesson_progress.is_perfect or excluded.is_perfect,
    completed_at = coalesce(public.user_lesson_progress.completed_at, excluded.completed_at),
    updated_at = now();

  v_xp := public.award_xp(
    v_uid, 'lesson', p_lesson_id::text, public.config_int('xp_lesson_completion', 20)
  );

  if not coalesce(v_already, false) then
    update public.user_stats
    set lessons_completed = lessons_completed + 1
    where user_id = v_uid;

    perform public.touch_daily_activity(v_uid, 1, 0, v_xp);
  elsif v_xp > 0 then
    perform public.touch_daily_activity(v_uid, 0, 0, v_xp);
  end if;

  return jsonb_build_object(
    'lesson_id', p_lesson_id,
    'questions_total', v_total,
    'questions_correct', coalesce(v_correct, 0),
    'first_try_correct', coalesce(v_first_try, 0),
    'is_perfect', v_perfect,
    'xp_awarded', v_xp,
    'already_completed', coalesce(v_already, false),
    'xp_total', (select xp_total from public.user_stats where user_id = v_uid)
  );
end;
$$;

comment on function public.complete_lesson(uuid) is
  'Records a lesson as completed and pays completion XP once (SPEC §19, §25).';

-- ---------------------------------------------------------------------------------------
-- get_progress_summary (SPEC §28)
-- ---------------------------------------------------------------------------------------
--
-- One round trip for the whole Progress screen. The level is NOT computed here: SPEC §20
-- makes it a derived display value, so the client computes it from `xp_total` and the
-- thresholds it already has in config. Duplicating that rule in SQL would create two places
-- for it to drift.
--
-- Per-skill accuracy and weak areas are Premium (SPEC §28). The entitlement is checked HERE
-- rather than hidden in the client, so a free user's response simply does not contain them.

create or replace function public.get_progress_summary(p_locale text default 'en')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
  v_stats public.user_stats;
  v_premium boolean;
  v_modules jsonb;
  v_skills jsonb;
  v_total_lessons integer;
  v_completed_lessons integer;
begin
  select s.* into v_stats from public.user_stats s where s.user_id = v_uid;
  v_premium := public.has_entitlement(v_uid, 'premium');

  -- Course completion counts only lessons the user could actually reach, so a free learner
  -- is not permanently stuck at 35% because Premium modules exist.
  select
    count(*) filter (where public.can_access_module(v_uid, m.id)),
    count(*) filter (
      where public.can_access_module(v_uid, m.id)
        and exists (
          select 1 from public.user_lesson_progress p
          where p.user_id = v_uid and p.lesson_id = l.id and p.completed_at is not null
        )
    )
  into v_total_lessons, v_completed_lessons
  from public.lessons l
  join public.modules m on m.id = l.module_id
  where l.is_active and m.is_active;

  select coalesce(jsonb_agg(row_to_json(t) order by t.order_index), '[]'::jsonb)
  into v_modules
  from (
    select
      m.id,
      m.slug,
      public.localized_text(m.title, p_locale) as title,
      m.order_index,
      public.module_requires_premium(m.id) as is_premium,
      public.can_access_module(v_uid, m.id) as is_unlocked,
      count(l.id) as lesson_count,
      count(p.lesson_id) filter (where p.completed_at is not null) as completed_count
    from public.modules m
    left join public.lessons l on l.module_id = m.id and l.is_active
    left join public.user_lesson_progress p
      on p.lesson_id = l.id and p.user_id = v_uid
    where m.is_active
    group by m.id, m.slug, m.title, m.order_index
  ) t;

  -- Skill areas (SPEC §28). Mastery is coverage of the course — distinct questions carrying
  -- the tag answered correctly, over all active questions carrying it — which is why an
  -- untouched area reads 0% rather than being absent.
  select coalesce(jsonb_agg(row_to_json(t) order by t.tag), '[]'::jsonb)
  into v_skills
  from (
    select
      tag,
      count(distinct q.id) as question_count,
      count(distinct q.id) filter (
        where exists (
          select 1 from public.user_question_attempts a
          where a.user_id = v_uid and a.question_id = q.id and a.is_correct
        )
      ) as mastered_count,
      case when v_premium then count(distinct a2.question_id) else null end as attempted_count,
      case when v_premium then count(a2.id) else null end as attempts,
      case when v_premium then count(a2.id) filter (where a2.is_correct) else null end
        as correct_attempts
    from public.questions q
    cross join lateral unnest(q.skill_tags) as tag
    left join public.user_question_attempts a2
      on a2.question_id = q.id and a2.user_id = v_uid and v_premium
    where q.is_active
    group by tag
  ) t;

  return jsonb_build_object(
    'xp_total', coalesce(v_stats.xp_total, 0),
    'current_streak', coalesce(v_stats.current_streak, 0),
    'longest_streak', coalesce(v_stats.longest_streak, 0),
    'lessons_completed', coalesce(v_stats.lessons_completed, 0),
    'questions_answered', coalesce(v_stats.questions_answered, 0),
    'questions_correct', coalesce(v_stats.questions_correct, 0),
    'lessons_total', coalesce(v_total_lessons, 0),
    'lessons_completed_unlocked', coalesce(v_completed_lessons, 0),
    'is_premium', v_premium,
    'modules', v_modules,
    'skills', v_skills
  );
end;
$$;

comment on function public.get_progress_summary(text) is
  'The whole Progress screen in one round trip. Per-skill accuracy is Premium (SPEC §28).';

-- ---------------------------------------------------------------------------------------
-- get_user_stats — the small, hot one
-- ---------------------------------------------------------------------------------------
--
-- Home and Profile show XP and level on every open. `user_stats` is readable directly under
-- RLS, but going through a function keeps the shape stable as Phase 10 adds lives and streaks.

create or replace function public.get_user_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
  v_stats public.user_stats;
begin
  select s.* into v_stats from public.user_stats s where s.user_id = v_uid;

  return jsonb_build_object(
    'xp_total', coalesce(v_stats.xp_total, 0),
    'current_streak', coalesce(v_stats.current_streak, 0),
    'longest_streak', coalesce(v_stats.longest_streak, 0),
    'lives', coalesce(v_stats.lives, 0),
    'lessons_completed', coalesce(v_stats.lessons_completed, 0),
    'questions_answered', coalesce(v_stats.questions_answered, 0),
    'questions_correct', coalesce(v_stats.questions_correct, 0)
  );
end;
$$;

comment on function public.get_user_stats() is
  'XP, streak and lives for the header on Home and Profile.';

-- ---------------------------------------------------------------------------------------
-- Grants (SPEC §40, default-deny)
-- ---------------------------------------------------------------------------------------

revoke all on function public.touch_daily_activity(uuid, integer, integer, integer)
  from public, anon, authenticated;
revoke all on function public.complete_lesson(uuid) from public, anon, authenticated;
revoke all on function public.get_progress_summary(text) from public, anon, authenticated;
revoke all on function public.get_user_stats() from public, anon, authenticated;

grant execute on function public.complete_lesson(uuid) to authenticated;
grant execute on function public.get_progress_summary(text) to authenticated;
grant execute on function public.get_user_stats() to authenticated;

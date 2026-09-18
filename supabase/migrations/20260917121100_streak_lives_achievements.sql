-- CodeSprint — streaks, lives and achievements (SPEC §21, §22, §25, Phase 10).
--
-- The three systems that turn answering questions into a habit. All three are lazy by
-- design: no nightly job decides that a streak broke or that a life came back. A streak is
-- computed when it is read, and lives regenerate from a timestamp. That is a deliberate cost
-- decision (SPEC §60) and it also removes a whole class of bug — a cron that did not run.

-- ---------------------------------------------------------------------------------------
-- 1. Streaks (SPEC §21)
-- ---------------------------------------------------------------------------------------

/**
 * The streak as it stands right now.
 *
 * Computed on read rather than stored: `current_streak` in the table is the value AS OF the
 * last qualifying day, and it only remains true while that day is today or yesterday. A user
 * who stops for a week has a broken streak the moment they look, without anything having run
 * overnight to tell them so.
 */
create or replace function public.current_streak_for(p_user_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_timezone text;
  v_today date;
  v_last date;
  v_streak integer;
begin
  select p.timezone into v_timezone from public.profiles p where p.id = p_user_id;
  select s.last_qualifying_date, s.current_streak into v_last, v_streak
  from public.user_stats s where s.user_id = p_user_id;

  if v_last is null then
    return 0;
  end if;

  v_today := public.local_date_for(coalesce(v_timezone, 'UTC'));

  -- Today keeps it; yesterday keeps it alive until midnight. Anything older is broken.
  if v_last >= v_today - 1 then
    return coalesce(v_streak, 0);
  end if;

  return 0;
end;
$$;

comment on function public.current_streak_for(uuid) is
  'The streak as of now, computed lazily — a broken streak reads as 0 with no nightly job.';

/**
 * Decides whether today now qualifies, and extends the streak if it just did.
 *
 * A day qualifies at one completed lesson OR five answered questions (SPEC §21, configurable).
 * `qualified` is set once per day, so this is safe to call after every answer.
 */
create or replace function public.evaluate_streak(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timezone text;
  v_today date;
  v_day public.user_daily_activity;
  v_last date;
  v_streak integer;
  v_next integer;
begin
  select p.timezone into v_timezone from public.profiles p where p.id = p_user_id;
  v_today := public.local_date_for(coalesce(v_timezone, 'UTC'));

  select d.* into v_day
  from public.user_daily_activity d
  where d.user_id = p_user_id and d.local_date = v_today;

  if v_day.user_id is null or v_day.qualified then
    -- Nothing today, or today already counted. Either way the streak does not move.
    return public.current_streak_for(p_user_id);
  end if;

  if v_day.lessons_completed < public.config_int('streak_min_lessons', 1)
     and v_day.questions_answered < public.config_int('streak_min_questions', 5) then
    return public.current_streak_for(p_user_id);
  end if;

  update public.user_daily_activity
  set qualified = true, updated_at = now()
  where user_id = p_user_id and local_date = v_today;

  select s.last_qualifying_date, s.current_streak into v_last, v_streak
  from public.user_stats s where s.user_id = p_user_id;

  -- Yesterday continues it; anything else starts again at one.
  v_next := case when v_last = v_today - 1 then coalesce(v_streak, 0) + 1 else 1 end;

  update public.user_stats
  set current_streak = v_next,
      longest_streak = greatest(longest_streak, v_next),
      last_qualifying_date = v_today
  where user_id = p_user_id;

  return v_next;
end;
$$;

comment on function public.evaluate_streak(uuid) is
  'Marks today as qualifying once the daily minimum is met and extends the streak (SPEC §21).';

-- ---------------------------------------------------------------------------------------
-- 2. Lives (SPEC §22)
-- ---------------------------------------------------------------------------------------

/**
 * Regenerates lives from elapsed time, lazily.
 *
 * The clock is advanced by exactly the intervals consumed, never to `now()`. Setting it to
 * now would mean a user who opens the app every ten minutes never regenerates anything,
 * because each check would throw away the partial progress since the last one.
 */
create or replace function public.regenerate_lives(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stats public.user_stats;
  v_max integer := public.config_int('lives_max', 5);
  v_minutes integer := greatest(1, public.config_int('lives_regen_minutes', 240));
  v_elapsed numeric;
  v_gained integer;
begin
  select s.* into v_stats from public.user_stats s where s.user_id = p_user_id;
  if v_stats.user_id is null then
    return 0;
  end if;

  -- Premium has unlimited lives, so there is nothing to regenerate (SPEC §22).
  if public.has_entitlement(p_user_id, 'premium') then
    return v_max;
  end if;

  if v_stats.lives >= v_max then
    -- Already full: restart the clock so the next lost life waits a full interval.
    update public.user_stats set lives_updated_at = now() where user_id = p_user_id;
    return v_stats.lives;
  end if;

  v_elapsed := extract(epoch from (now() - v_stats.lives_updated_at)) / 60.0;
  v_gained := floor(v_elapsed / v_minutes);

  if v_gained <= 0 then
    return v_stats.lives;
  end if;

  v_gained := least(v_gained, v_max - v_stats.lives);

  update public.user_stats
  set lives = lives + v_gained,
      lives_updated_at = lives_updated_at + make_interval(mins => v_gained * v_minutes)
  where user_id = p_user_id;

  return v_stats.lives + v_gained;
end;
$$;

comment on function public.regenerate_lives(uuid) is
  'Lazily credits lives earned since lives_updated_at, advancing the clock by what it spent.';

/**
 * Takes a life for a wrong answer, when the rules say one should be taken.
 *
 * Returns the remaining lives. Nothing is taken for Premium, outside the configured contexts,
 * or during the first-session grace — a beginner losing their lives in the first three lessons
 * learns that the app punishes learning (SPEC §22).
 */
create or replace function public.consume_life(p_user_id uuid, p_context public.answer_context)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lives integer;
  v_max integer := public.config_int('lives_max', 5);
  v_lessons integer;
  v_contexts jsonb;
begin
  if public.has_entitlement(p_user_id, 'premium') then
    return v_max;
  end if;

  select value into v_contexts from public.app_config where key = 'lives_consume_in';
  if not coalesce(v_contexts, '["lesson","practice","challenge"]'::jsonb) ? p_context::text then
    return public.regenerate_lives(p_user_id);
  end if;

  select s.lessons_completed into v_lessons
  from public.user_stats s where s.user_id = p_user_id;

  if coalesce(v_lessons, 0) < public.config_int('lives_grace_lessons', 3) then
    return public.regenerate_lives(p_user_id);
  end if;

  v_lives := public.regenerate_lives(p_user_id);
  if v_lives <= 0 then
    return 0;
  end if;

  -- Losing the first life is what starts the regeneration clock. When lives are already
  -- below the maximum the clock is running, and restarting it here would mean a user who
  -- keeps answering never regenerates.
  update public.user_stats
  set lives = lives - 1,
      lives_updated_at = case when lives >= v_max then now() else lives_updated_at end
  where user_id = p_user_id;

  return v_lives - 1;
end;
$$;

comment on function public.consume_life(uuid, public.answer_context) is
  'Takes one life for a wrong answer, respecting Premium, context and the beginner grace.';

/** Lives plus when the next one arrives, for the header and the out-of-lives screen. */
create or replace function public.lives_state(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lives integer;
  v_max integer := public.config_int('lives_max', 5);
  v_minutes integer := greatest(1, public.config_int('lives_regen_minutes', 240));
  v_updated timestamptz;
  v_unlimited boolean := public.has_entitlement(p_user_id, 'premium');
begin
  v_lives := public.regenerate_lives(p_user_id);
  select s.lives_updated_at into v_updated from public.user_stats s where s.user_id = p_user_id;

  return jsonb_build_object(
    'lives', case when v_unlimited then v_max else v_lives end,
    'max', v_max,
    'unlimited', v_unlimited,
    'next_life_at', case
      when v_unlimited or v_lives >= v_max then null
      else v_updated + make_interval(mins => v_minutes)
    end
  );
end;
$$;

comment on function public.lives_state(uuid) is
  'Current lives and when the next one arrives (SPEC §22).';

-- ---------------------------------------------------------------------------------------
-- 3. The achievement catalogue (SPEC §25)
-- ---------------------------------------------------------------------------------------
--
-- Reference data, not content: it ships with the schema rather than through the content
-- pipeline, because the rule types it uses are code. Adding an achievement that reuses an
-- existing rule type is a data change; a new rule type is a change to evaluate_achievements.

insert into public.achievements (id, slug, name, description, icon_key, rule, xp_reward, sort_order)
values
  ('70350125-3cc8-4c4f-b619-b03df4c1c7e9', 'first-lesson',
   '{"en":"First Lesson"}', '{"en":"You finished your first lesson."}',
   'footsteps', '{"type":"lessons_completed","gte":1}', 10, 10),

  ('e849523c-e038-433f-b638-a16dcf789b21', 'first-100-xp',
   '{"en":"First 100 XP"}', '{"en":"You earned your first hundred experience points."}',
   'star', '{"type":"xp_total","gte":100}', 15, 20),

  ('a19eee33-aaca-43c5-9be2-b43e4aa972f7', 'streak-3',
   '{"en":"Three Day Streak"}', '{"en":"Three days in a row. The habit is forming."}',
   'flame', '{"type":"streak_days","gte":3}', 20, 30),

  ('cca15a7d-d161-4749-a275-91045dd99509', 'streak-7',
   '{"en":"Week Streak"}', '{"en":"Seven days in a row."}',
   'flame', '{"type":"streak_days","gte":7}', 40, 40),

  ('5e5fdedb-2dea-47d6-b6fb-12ed58dbbab8', 'streak-30',
   '{"en":"Month Streak"}', '{"en":"Thirty days in a row. That is a real habit."}',
   'flame', '{"type":"streak_days","gte":30}', 100, 50),

  ('244de493-5a65-4295-b885-03378e694068', 'questions-100',
   '{"en":"100 Questions"}', '{"en":"You have answered a hundred questions."}',
   'help-circle', '{"type":"questions_answered","gte":100}', 25, 60),

  ('9cc24573-f7c3-45d0-9172-064d7b2f06a8', 'questions-500',
   '{"en":"500 Questions"}', '{"en":"Five hundred questions answered."}',
   'help-circle', '{"type":"questions_answered","gte":500}', 75, 70),

  ('e0bcc224-89d4-4aff-9bdd-d74e8ea2b061', 'perfect-lesson',
   '{"en":"Perfect Lesson"}', '{"en":"Every question right on the first attempt."}',
   'ribbon', '{"type":"perfect_lesson"}', 20, 80),

  -- Modules 3 and 9 of the planned course (SPEC §14). Their content arrives in Phase 19, so
  -- these cannot unlock before then — which is correct, not a gap.
  ('faa47515-1c89-4a75-8f4c-2d8554b51dbf', 'python-beginner',
   '{"en":"Python Beginner"}', '{"en":"You finished Data Types & Type Conversion."}',
   'school', '{"type":"module_completed","module_slug":"data-types"}', 50, 90),

  ('5737d657-0027-4202-880a-69b6ba0d0864', 'python-explorer',
   '{"en":"Python Explorer"}', '{"en":"You finished Functions."}',
   'compass', '{"type":"module_completed","module_slug":"functions"}', 80, 100),

  -- Exams arrive in Phase 13; these rules evaluate to false until then.
  ('4ee9d9ed-c6ca-4cc4-98be-07af083d78d3', 'first-exam',
   '{"en":"First Exam"}', '{"en":"You sat your first exam."}',
   'clipboard', '{"type":"exams_completed","gte":1}', 25, 110),

  ('f08ae20f-be7c-4df0-8dc8-a2bba1f0b9aa', 'exam-passed',
   '{"en":"Exam Passed"}', '{"en":"You passed an exam."}',
   'trophy', '{"type":"exam_passed"}', 60, 120),

  ('8d2635c6-70df-4725-9801-2b1587940516', 'exams-10',
   '{"en":"Ten Exams"}', '{"en":"You have completed ten exams."}',
   'trophy', '{"type":"exams_completed","gte":10}', 120, 130)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  icon_key = excluded.icon_key,
  rule = excluded.rule,
  xp_reward = excluded.xp_reward,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------------------
-- 4. The achievement engine (SPEC §25)
-- ---------------------------------------------------------------------------------------

/**
 * Whether one rule currently holds for one user.
 *
 * Every rule type is a query over state the user already has. Adding an achievement that
 * reuses a type needs no code; a new type is one branch here.
 */
create or replace function public.achievement_rule_met(p_user_id uuid, p_rule jsonb)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_type text := p_rule ->> 'type';
  v_gte integer := coalesce((p_rule ->> 'gte')::integer, 1);
  v_stats public.user_stats;
begin
  select s.* into v_stats from public.user_stats s where s.user_id = p_user_id;

  case v_type
    when 'lessons_completed' then
      return coalesce(v_stats.lessons_completed, 0) >= v_gte;

    when 'xp_total' then
      return coalesce(v_stats.xp_total, 0) >= v_gte;

    when 'questions_answered' then
      return coalesce(v_stats.questions_answered, 0) >= v_gte;

    when 'streak_days' then
      -- The live streak, not the stored one: a broken streak must not unlock anything.
      return public.current_streak_for(p_user_id) >= v_gte;

    when 'perfect_lesson' then
      return exists (
        select 1 from public.user_lesson_progress p
        where p.user_id = p_user_id and p.is_perfect
      );

    when 'module_completed' then
      return exists (
        select 1
        from public.modules m
        where m.slug = p_rule ->> 'module_slug'
          and m.is_active
          and exists (select 1 from public.lessons l where l.module_id = m.id and l.is_active)
          -- Every active lesson in the module has a completed progress row.
          and not exists (
            select 1
            from public.lessons l
            where l.module_id = m.id and l.is_active
              and not exists (
                select 1 from public.user_lesson_progress p
                where p.user_id = p_user_id and p.lesson_id = l.id and p.completed_at is not null
              )
          )
      );

    when 'exams_completed' then
      return (
        select count(*) from public.exam_attempts a
        where a.user_id = p_user_id and a.submitted_at is not null
      ) >= v_gte;

    when 'exam_passed' then
      return exists (
        select 1 from public.exam_attempts a
        where a.user_id = p_user_id and a.passed
      );

    else
      -- An unknown rule type never unlocks. A typo in the catalogue is then a quiet
      -- non-event rather than an exception in the middle of answering a question.
      return false;
  end case;
end;
$$;

comment on function public.achievement_rule_met(uuid, jsonb) is
  'Internal: evaluates one achievement rule. An unknown type never unlocks (SPEC §25).';

/**
 * Unlocks whatever the given kinds of event could have earned.
 *
 * Only the rule types affected by what just happened are evaluated (SPEC §25), so answering a
 * question does not scan the exam tables.
 *
 * Evaluated ONCE per call. Achievement XP goes through the ledger like everything else, so
 * unlocking "First 100 XP" can push the total past another threshold — that one unlocks on
 * the next event rather than recursing here, which is what the spec asks for and what keeps
 * this bounded.
 */
create or replace function public.evaluate_achievements(p_user_id uuid, p_rule_types text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_achievement public.achievements;
  v_unlocked jsonb := '[]'::jsonb;
begin
  for v_achievement in
    select a.*
    from public.achievements a
    where a.is_active
      and (a.rule ->> 'type') = any (p_rule_types)
      and not exists (
        select 1 from public.user_achievements u
        where u.user_id = p_user_id and u.achievement_id = a.id
      )
    order by a.sort_order
  loop
    if public.achievement_rule_met(p_user_id, v_achievement.rule) then
      insert into public.user_achievements (user_id, achievement_id)
      values (p_user_id, v_achievement.id)
      on conflict (user_id, achievement_id) do nothing;

      if found then
        perform public.award_xp(
          p_user_id, 'achievement', v_achievement.id::text, v_achievement.xp_reward
        );

        v_unlocked := v_unlocked || jsonb_build_object(
          'id', v_achievement.id,
          'slug', v_achievement.slug,
          'icon_key', v_achievement.icon_key,
          'xp_reward', v_achievement.xp_reward
        );
      end if;
    end if;
  end loop;

  return v_unlocked;
end;
$$;

comment on function public.evaluate_achievements(uuid, text[]) is
  'Unlocks achievements for the rule types affected by an event, once per call (SPEC §25).';

/** The catalogue plus what this user has unlocked, for the Profile screen. */
create or replace function public.get_achievements(p_locale text default 'en')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
begin
  return (
    select coalesce(jsonb_agg(row_to_json(t) order by t.sort_order), '[]'::jsonb)
    from (
      select
        a.id,
        a.slug,
        public.localized_text(a.name, p_locale) as name,
        public.localized_text(a.description, p_locale) as description,
        a.icon_key,
        a.xp_reward,
        a.sort_order,
        u.unlocked_at
      from public.achievements a
      left join public.user_achievements u
        on u.achievement_id = a.id and u.user_id = v_uid
      where a.is_active
    ) t
  );
end;
$$;

comment on function public.get_achievements(text) is
  'Every active achievement with this user''s unlock date, locked ones included (SPEC §29).';

-- ---------------------------------------------------------------------------------------
-- 5. Wiring it into the answer and completion RPCs
-- ---------------------------------------------------------------------------------------

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

  -- A wrong answer costs a life; a right one does not. Exams use attempt limits instead
  -- (SPEC §22), which is why the context is checked inside consume_life rather than here.
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
  v_streak integer;
  v_unlocked jsonb;
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

  v_streak := public.evaluate_streak(v_uid);
  v_unlocked := public.evaluate_achievements(
    v_uid,
    array['lessons_completed', 'perfect_lesson', 'module_completed', 'xp_total', 'streak_days']
  );

  return jsonb_build_object(
    'lesson_id', p_lesson_id,
    'questions_total', v_total,
    'questions_correct', coalesce(v_correct, 0),
    'first_try_correct', coalesce(v_first_try, 0),
    'is_perfect', v_perfect,
    'xp_awarded', v_xp,
    'already_completed', coalesce(v_already, false),
    'xp_total', (select xp_total from public.user_stats where user_id = v_uid),
    'current_streak', v_streak,
    'unlocked', v_unlocked
  );
end;
$$;

-- ---------------------------------------------------------------------------------------
-- 6. Stats and summary now report the LIVE streak and lives
-- ---------------------------------------------------------------------------------------

create or replace function public.get_user_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
  v_stats public.user_stats;
  v_lives jsonb := public.lives_state(v_uid);
begin
  select s.* into v_stats from public.user_stats s where s.user_id = v_uid;

  return jsonb_build_object(
    'xp_total', coalesce(v_stats.xp_total, 0),
    -- The live value, so a streak broken overnight reads as 0 the moment the app opens.
    'current_streak', public.current_streak_for(v_uid),
    'longest_streak', coalesce(v_stats.longest_streak, 0),
    'lives', (v_lives ->> 'lives')::integer,
    'lives_max', (v_lives ->> 'max')::integer,
    'lives_unlimited', (v_lives ->> 'unlimited')::boolean,
    'next_life_at', v_lives -> 'next_life_at',
    'lessons_completed', coalesce(v_stats.lessons_completed, 0),
    'questions_answered', coalesce(v_stats.questions_answered, 0),
    'questions_correct', coalesce(v_stats.questions_correct, 0)
  );
end;
$$;

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
  v_achievements jsonb;
begin
  select s.* into v_stats from public.user_stats s where s.user_id = v_uid;
  v_premium := public.has_entitlement(v_uid, 'premium');

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

  select jsonb_build_object(
    'unlocked', count(*) filter (where u.user_id is not null),
    'total', count(*)
  )
  into v_achievements
  from public.achievements a
  left join public.user_achievements u on u.achievement_id = a.id and u.user_id = v_uid
  where a.is_active;

  return jsonb_build_object(
    'xp_total', coalesce(v_stats.xp_total, 0),
    'current_streak', public.current_streak_for(v_uid),
    'longest_streak', coalesce(v_stats.longest_streak, 0),
    'lessons_completed', coalesce(v_stats.lessons_completed, 0),
    'questions_answered', coalesce(v_stats.questions_answered, 0),
    'questions_correct', coalesce(v_stats.questions_correct, 0),
    'lessons_total', coalesce(v_total_lessons, 0),
    'lessons_completed_unlocked', coalesce(v_completed_lessons, 0),
    'is_premium', v_premium,
    'modules', v_modules,
    'skills', v_skills,
    'achievements', v_achievements
  );
end;
$$;

-- ---------------------------------------------------------------------------------------
-- 7. Grants (SPEC §40, default-deny)
-- ---------------------------------------------------------------------------------------

revoke all on function public.current_streak_for(uuid) from public, anon, authenticated;
revoke all on function public.evaluate_streak(uuid) from public, anon, authenticated;
revoke all on function public.regenerate_lives(uuid) from public, anon, authenticated;
revoke all on function public.consume_life(uuid, public.answer_context)
  from public, anon, authenticated;
revoke all on function public.lives_state(uuid) from public, anon, authenticated;
revoke all on function public.achievement_rule_met(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.evaluate_achievements(uuid, text[]) from public, anon, authenticated;
revoke all on function public.get_achievements(text) from public, anon, authenticated;

-- Only the read-only catalogue is client-callable. Everything that MOVES a streak, a life or
-- an unlock runs inside the answer and completion RPCs, where the event that earned it is.
grant execute on function public.get_achievements(text) to authenticated;

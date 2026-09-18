-- Streaks, lives and achievements (SPEC §21, §22, §25, Phase 10).
--
-- All three systems are LAZY: nothing runs overnight to break a streak or return a life. That
-- makes the interesting cases the ones involving time — a day passing, a timezone changing,
-- a regeneration interval elapsing — so most of this file manipulates timestamps directly and
-- checks what the functions then decide.

create extension if not exists pgtap with schema extensions;

begin;
select plan(55);

create or replace function pg_temp.act_as(p_uid uuid)
returns void language plpgsql as $$
begin
  execute 'set local role authenticated';
  execute format('set local request.jwt.claims = %L',
                 json_build_object('sub', p_uid, 'role', 'authenticated')::text);
end;
$$;

create or replace function pg_temp.act_as_owner()
returns void language plpgsql as $$
begin
  execute 'reset role';
  execute 'set local request.jwt.claims = ''''';
end;
$$;

create or replace function pg_temp.lesson(p_module integer, p_lesson integer)
returns uuid language sql security definer as $$
  select l.id from public.lessons l
  join public.modules m on m.id = l.module_id
  where m.order_index = p_module and l.order_index = p_lesson;
$$;

create or replace function pg_temp.questions_of(p_lesson uuid)
returns setof uuid language sql security definer as $$
  select q.id from public.questions q
  where q.lesson_id = p_lesson and q.is_active order by q.order_index;
$$;

create or replace function pg_temp.answer_for(p_question uuid)
returns jsonb language sql security definer as $$
  select k.answer from public.question_answer_keys k where k.question_id = p_question;
$$;

/** Today, for one user, in their own timezone. */
create or replace function pg_temp.today_for(p_uid uuid)
returns date language sql security definer as $$
  select public.local_date_for(coalesce(
    (select p.timezone from public.profiles p where p.id = p_uid), 'UTC'));
$$;

-- A = streak subject, B = lives subject, C = achievements subject.
insert into auth.users (id, email) values
  ('bbbb2222-0000-0000-0000-00000000000a', 'streak@test.local'),
  ('bbbb2222-0000-0000-0000-00000000000b', 'lives@test.local'),
  ('bbbb2222-0000-0000-0000-00000000000c', 'achieve@test.local'),
  ('bbbb2222-0000-0000-0000-00000000000d', 'livespremium@test.local');

insert into public.user_entitlements (user_id, entitlement, is_active)
values ('bbbb2222-0000-0000-0000-00000000000d', 'premium', true);

-- ---------------------------------------------------------------------------------------
-- Streaks (SPEC §21)
-- ---------------------------------------------------------------------------------------

select is(
  public.current_streak_for('bbbb2222-0000-0000-0000-00000000000a'),
  0,
  'a user who has never qualified has no streak'
);

-- One answered question is below the five-question bar and no lesson is finished.
select pg_temp.act_as('bbbb2222-0000-0000-0000-00000000000a');
select public.submit_answer(
  (select * from pg_temp.questions_of(pg_temp.lesson(1, 1)) limit 1),
  '{"value": true}'::jsonb
);
select pg_temp.act_as_owner();

select is(
  public.current_streak_for('bbbb2222-0000-0000-0000-00000000000a'),
  0,
  'one question does not qualify a day'
);

select is(
  (select qualified from public.user_daily_activity
    where user_id = 'bbbb2222-0000-0000-0000-00000000000a'),
  false,
  'and the day is not marked as qualifying'
);

-- Five questions does (SPEC §21: one lesson OR five questions).
select pg_temp.act_as('bbbb2222-0000-0000-0000-00000000000a');
select public.submit_answer(q, '{"value": true}'::jsonb)
from pg_temp.questions_of(pg_temp.lesson(1, 1)) q;
select pg_temp.act_as_owner();

select is(
  public.current_streak_for('bbbb2222-0000-0000-0000-00000000000a'),
  1,
  'five answered questions qualify the day'
);

select is(
  (select last_qualifying_date from public.user_stats
    where user_id = 'bbbb2222-0000-0000-0000-00000000000a'),
  pg_temp.today_for('bbbb2222-0000-0000-0000-00000000000a'),
  'and the qualifying date is recorded'
);

-- Answering more on the same day must not push the streak to 2.
select pg_temp.act_as('bbbb2222-0000-0000-0000-00000000000a');
select public.submit_answer(q, '{"value": true}'::jsonb)
from pg_temp.questions_of(pg_temp.lesson(1, 1)) q;
select pg_temp.act_as_owner();

select is(
  public.current_streak_for('bbbb2222-0000-0000-0000-00000000000a'),
  1,
  'a second session on the same day does not extend the streak'
);

-- Yesterday continues it. Backdate the state and give today a fresh qualifying day.
select pg_temp.act_as_owner();
update public.user_stats
set last_qualifying_date = pg_temp.today_for('bbbb2222-0000-0000-0000-00000000000a') - 1,
    current_streak = 4
where user_id = 'bbbb2222-0000-0000-0000-00000000000a';
update public.user_daily_activity set qualified = false
where user_id = 'bbbb2222-0000-0000-0000-00000000000a';

select is(
  public.evaluate_streak('bbbb2222-0000-0000-0000-00000000000a'),
  5,
  'qualifying the day after the last one extends the streak'
);

select is(
  (select longest_streak from public.user_stats
    where user_id = 'bbbb2222-0000-0000-0000-00000000000a'),
  5,
  'and the longest streak follows it up'
);

-- A gap resets to 1 rather than continuing.
select pg_temp.act_as_owner();
update public.user_stats
set last_qualifying_date = pg_temp.today_for('bbbb2222-0000-0000-0000-00000000000a') - 3
where user_id = 'bbbb2222-0000-0000-0000-00000000000a';
update public.user_daily_activity set qualified = false
where user_id = 'bbbb2222-0000-0000-0000-00000000000a';

select is(
  public.evaluate_streak('bbbb2222-0000-0000-0000-00000000000a'),
  1,
  'a gap of more than one day starts the streak again at 1'
);

select is(
  (select longest_streak from public.user_stats
    where user_id = 'bbbb2222-0000-0000-0000-00000000000a'),
  5,
  'but the longest streak is a record and is never reduced'
);

-- Reading a stale streak. Nothing ran overnight; the read decides.
select pg_temp.act_as_owner();
update public.user_stats
set last_qualifying_date = pg_temp.today_for('bbbb2222-0000-0000-0000-00000000000a') - 1,
    current_streak = 9
where user_id = 'bbbb2222-0000-0000-0000-00000000000a';

select is(
  public.current_streak_for('bbbb2222-0000-0000-0000-00000000000a'),
  9,
  'a streak from yesterday is still alive today'
);

update public.user_stats
set last_qualifying_date = pg_temp.today_for('bbbb2222-0000-0000-0000-00000000000a') - 2
where user_id = 'bbbb2222-0000-0000-0000-00000000000a';

select is(
  public.current_streak_for('bbbb2222-0000-0000-0000-00000000000a'),
  0,
  'a streak last extended two days ago reads as broken, with no job having run'
);

-- Timezone: the same instant is a different date either side of the date line.
select is(
  public.local_date_for('Pacific/Kiritimati', timestamptz '2026-03-01 11:00:00+00')
    - public.local_date_for('Pacific/Midway', timestamptz '2026-03-01 11:00:00+00'),
  1,
  'local dates differ by a day across the date line at the same instant'
);

-- DST: the day a clock jumps forward is still one calendar day (SPEC §21).
select is(
  public.local_date_for('Europe/Bucharest', timestamptz '2026-03-29 01:30:00+02'),
  date '2026-03-29',
  'a spring-forward morning resolves to the right local date'
);

select is(
  public.local_date_for('Europe/Bucharest', timestamptz '2026-03-29 22:30:00+03')
    - public.local_date_for('Europe/Bucharest', timestamptz '2026-03-28 22:30:00+02'),
  1,
  'and a DST transition still advances the date by exactly one day'
);

select is(
  public.local_date_for('Not/AZone', timestamptz '2026-03-01 11:00:00+00'),
  date '2026-03-01',
  'an unknown timezone degrades to UTC rather than raising'
);

-- ---------------------------------------------------------------------------------------
-- Lives (SPEC §22)
-- ---------------------------------------------------------------------------------------

select is(
  (select lives from public.user_stats where user_id = 'bbbb2222-0000-0000-0000-00000000000b'),
  5,
  'a new user starts with a full set of lives'
);

-- Grace: the first three lessons cost nothing (SPEC §22).
select is(
  public.consume_life('bbbb2222-0000-0000-0000-00000000000b', 'lesson'),
  5,
  'a wrong answer during the beginner grace costs no life'
);

select pg_temp.act_as_owner();
update public.user_stats set lessons_completed = 3
where user_id = 'bbbb2222-0000-0000-0000-00000000000b';

select is(
  public.consume_life('bbbb2222-0000-0000-0000-00000000000b', 'lesson'),
  4,
  'once the grace is over a wrong answer costs a life'
);

select is(
  public.consume_life('bbbb2222-0000-0000-0000-00000000000b', 'exam'),
  4,
  'an exam never costs a life — exams use attempt limits instead'
);

select is(
  public.consume_life('bbbb2222-0000-0000-0000-00000000000b', 'practice'),
  3,
  'practice does cost a life'
);

select is(
  public.consume_life('bbbb2222-0000-0000-0000-00000000000d', 'lesson'),
  5,
  'a premium user never loses a life'
);

-- Regeneration is lazy, from a timestamp.
select pg_temp.act_as_owner();
update public.user_stats
set lives = 1, lives_updated_at = now() - interval '3 hours'
where user_id = 'bbbb2222-0000-0000-0000-00000000000b';

select is(
  public.regenerate_lives('bbbb2222-0000-0000-0000-00000000000b'),
  1,
  'less than one full interval regenerates nothing'
);

update public.user_stats
set lives = 1, lives_updated_at = now() - interval '5 hours'
where user_id = 'bbbb2222-0000-0000-0000-00000000000b';

select is(
  public.regenerate_lives('bbbb2222-0000-0000-0000-00000000000b'),
  2,
  'one elapsed interval returns one life'
);

-- The clock advances by what it spent, not to now(): otherwise checking often would mean
-- never regenerating.
select ok(
  (select lives_updated_at from public.user_stats
    where user_id = 'bbbb2222-0000-0000-0000-00000000000b') < now() - interval '30 minutes',
  'and the remaining hour of progress is kept, not discarded'
);

update public.user_stats
set lives = 0, lives_updated_at = now() - interval '30 hours'
where user_id = 'bbbb2222-0000-0000-0000-00000000000b';

select is(
  public.regenerate_lives('bbbb2222-0000-0000-0000-00000000000b'),
  5,
  'a long absence regenerates up to the maximum and no further'
);

select is(
  public.consume_life('bbbb2222-0000-0000-0000-00000000000b', 'lesson'),
  4,
  'losing a life from full works after a regeneration'
);

select ok(
  (select lives_updated_at from public.user_stats
    where user_id = 'bbbb2222-0000-0000-0000-00000000000b') > now() - interval '1 minute',
  'and losing the first life restarts the regeneration clock'
);

-- Out of lives.
select pg_temp.act_as_owner();
update public.user_stats set lives = 0, lives_updated_at = now()
where user_id = 'bbbb2222-0000-0000-0000-00000000000b';

select is(
  public.consume_life('bbbb2222-0000-0000-0000-00000000000b', 'lesson'),
  0,
  'lives never go negative'
);

select is(
  (public.lives_state('bbbb2222-0000-0000-0000-00000000000b') ->> 'lives')::integer,
  0,
  'the lives state reports none left'
);

select isnt(
  (public.lives_state('bbbb2222-0000-0000-0000-00000000000b') -> 'next_life_at'),
  'null'::jsonb,
  'and says when the next one arrives'
);

select is(
  (public.lives_state('bbbb2222-0000-0000-0000-00000000000d') ->> 'unlimited')::boolean,
  true,
  'a premium user is reported as unlimited'
);

select is(
  (public.lives_state('bbbb2222-0000-0000-0000-00000000000d') -> 'next_life_at'),
  'null'::jsonb,
  'with no countdown, because there is nothing to wait for'
);

-- Wired into answering: a wrong answer costs, a right one does not.
select pg_temp.act_as_owner();
update public.user_stats set lives = 3, lessons_completed = 5
where user_id = 'bbbb2222-0000-0000-0000-00000000000b';

select pg_temp.act_as('bbbb2222-0000-0000-0000-00000000000b');

select is(
  (public.submit_answer(
    (select * from pg_temp.questions_of(pg_temp.lesson(1, 1)) limit 1),
    '{"value": false}'::jsonb
  ) -> 'lives' ->> 'lives')::integer,
  2,
  'a wrong answer costs a life through submit_answer'
);

select is(
  (public.submit_answer(
    (select * from pg_temp.questions_of(pg_temp.lesson(1, 1)) limit 1),
    '{"value": true}'::jsonb
  ) -> 'lives' ->> 'lives')::integer,
  2,
  'a correct answer costs nothing'
);

-- ---------------------------------------------------------------------------------------
-- Achievements (SPEC §25)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as_owner();

select is(
  (select count(*)::int from public.achievements where is_active),
  13,
  'the catalogue ships with the schema'
);

select ok(
  not public.achievement_rule_met('bbbb2222-0000-0000-0000-00000000000c',
    '{"type":"lessons_completed","gte":1}'),
  'a rule is not met before anything has happened'
);

select ok(
  not public.achievement_rule_met('bbbb2222-0000-0000-0000-00000000000c',
    '{"type":"invented_rule","gte":1}'),
  'an unknown rule type never unlocks, rather than raising'
);

-- Completing a lesson unlocks First Lesson and pays its XP through the ledger.
select pg_temp.act_as('bbbb2222-0000-0000-0000-00000000000c');
select public.submit_answer(q, pg_temp.answer_for(q))
from pg_temp.questions_of(pg_temp.lesson(1, 1)) q;

select is(
  jsonb_array_length(public.complete_lesson(pg_temp.lesson(1, 1)) -> 'unlocked'),
  2,
  'finishing a first perfect lesson unlocks First Lesson and Perfect Lesson'
);

select pg_temp.act_as_owner();

select ok(
  exists (
    select 1 from public.user_achievements u
    join public.achievements a on a.id = u.achievement_id
    where u.user_id = 'bbbb2222-0000-0000-0000-00000000000c' and a.slug = 'first-lesson'
  ),
  'the unlock is recorded'
);

select is(
  (select amount from public.xp_events
    where user_id = 'bbbb2222-0000-0000-0000-00000000000c'
      and source_type = 'achievement'
      and source_id = (select id::text from public.achievements where slug = 'first-lesson')),
  10,
  'and its XP goes through the ledger like everything else'
);

-- Re-completing must not unlock or pay again.
select pg_temp.act_as('bbbb2222-0000-0000-0000-00000000000c');

select is(
  jsonb_array_length(public.complete_lesson(pg_temp.lesson(1, 1)) -> 'unlocked'),
  0,
  'completing the same lesson again unlocks nothing'
);

select pg_temp.act_as_owner();

select is(
  (select count(*)::int from public.xp_events
    where user_id = 'bbbb2222-0000-0000-0000-00000000000c' and source_type = 'achievement'),
  2,
  'and pays nothing further'
);

-- module_completed, using a module that actually exists in the development seed.
select pg_temp.act_as_owner();
insert into public.achievements (slug, name, description, icon_key, rule, xp_reward, sort_order)
values ('test-module-done', '{"en":"Module done"}', '{"en":"Test"}', 'school',
        '{"type":"module_completed","module_slug":"getting-started"}', 5, 999);

select ok(
  not public.achievement_rule_met('bbbb2222-0000-0000-0000-00000000000c',
    '{"type":"module_completed","module_slug":"getting-started"}'),
  'a module with unfinished lessons does not count as completed'
);

-- Finish the other three lessons of module 1.
select pg_temp.act_as('bbbb2222-0000-0000-0000-00000000000c');
select public.complete_lesson(pg_temp.lesson(1, 2));
select public.complete_lesson(pg_temp.lesson(1, 3));
select public.complete_lesson(pg_temp.lesson(1, 4));
select pg_temp.act_as_owner();

select ok(
  public.achievement_rule_met('bbbb2222-0000-0000-0000-00000000000c',
    '{"type":"module_completed","module_slug":"getting-started"}'),
  'every lesson completed makes the module completed'
);

select ok(
  exists (
    select 1 from public.user_achievements u
    join public.achievements a on a.id = u.achievement_id
    where u.user_id = 'bbbb2222-0000-0000-0000-00000000000c' and a.slug = 'test-module-done'
  ),
  'and the module achievement unlocked on the completion that finished it'
);

select ok(
  not public.achievement_rule_met('bbbb2222-0000-0000-0000-00000000000c',
    '{"type":"module_completed","module_slug":"does-not-exist"}'),
  'a rule naming a module that does not exist never unlocks'
);

-- A streak achievement needs the LIVE streak, not a stale stored one.
select pg_temp.act_as_owner();
update public.user_stats
set current_streak = 10,
    last_qualifying_date = pg_temp.today_for('bbbb2222-0000-0000-0000-00000000000c') - 5
where user_id = 'bbbb2222-0000-0000-0000-00000000000c';

select ok(
  not public.achievement_rule_met('bbbb2222-0000-0000-0000-00000000000c',
    '{"type":"streak_days","gte":3}'),
  'a broken streak does not unlock a streak achievement, whatever the stored number says'
);

-- get_achievements returns the catalogue with lock state.
select pg_temp.act_as('bbbb2222-0000-0000-0000-00000000000c');

select ok(
  jsonb_array_length(public.get_achievements('en')) >= 13,
  'the catalogue lists locked achievements too, so there is something to aim at'
);

select ok(
  (select count(*) from jsonb_array_elements(public.get_achievements('en')) e
    where e -> 'unlocked_at' <> 'null'::jsonb) >= 3,
  'with unlock dates on the ones earned'
);

select ok(
  (select count(*) from jsonb_array_elements(public.get_achievements('en')) e
    where e -> 'unlocked_at' = 'null'::jsonb) > 0,
  'and nulls on the ones not'
);

-- ---------------------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as_owner();

select ok(
  not has_function_privilege('authenticated', 'public.consume_life(uuid, public.answer_context)', 'execute'),
  'a client cannot take or restore its own lives'
);

select ok(
  not has_function_privilege('authenticated', 'public.evaluate_streak(uuid)', 'execute'),
  'nor extend its own streak'
);

select ok(
  not has_function_privilege('authenticated', 'public.evaluate_achievements(uuid, text[])', 'execute'),
  'nor unlock its own achievements'
);

select ok(
  has_function_privilege('authenticated', 'public.get_achievements(text)', 'execute'),
  'but can read the catalogue'
);

select * from finish();
rollback;

-- XP totals, lesson completion and the progress summary (SPEC §19, §20, §25, §28, Phase 9).
--
-- The interesting failures here are all about counting twice: paying for a lesson on a second
-- read, incrementing lessons_completed every time, moving a completion timestamp that should
-- be a record of when it first happened. Each has its own test.

create extension if not exists pgtap with schema extensions;

begin;
select plan(36);

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

-- The five questions of module 1, lesson 1, in order.
-- SECURITY DEFINER: `questions` has no grants at all, which is exactly what production
-- relies on. A test fixture needs to see behind that.
create or replace function pg_temp.questions_of(p_lesson uuid)
returns setof uuid language sql security definer as $$
  select q.id from public.questions q
  where q.lesson_id = p_lesson and q.is_active
  order by q.order_index;
$$;

-- Likewise: answer keys are readable by nothing and nobody outside a SECURITY DEFINER
-- function. This fixture answers questions correctly on purpose, which needs the key.
create or replace function pg_temp.answer_for(p_question uuid)
returns jsonb language sql security definer as $$
  select k.answer from public.question_answer_keys k where k.question_id = p_question;
$$;

insert into auth.users (id, email) values
  ('aaaa1111-0000-0000-0000-000000000001', 'progress-free@test.local'),
  ('aaaa1111-0000-0000-0000-000000000002', 'progress-premium@test.local');

insert into public.user_entitlements (user_id, entitlement, is_active)
values ('aaaa1111-0000-0000-0000-000000000002', 'premium', true);

-- ---------------------------------------------------------------------------------------
-- Answering moves the counters
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('aaaa1111-0000-0000-0000-000000000001');

select public.submit_answer(
  (select * from pg_temp.questions_of(pg_temp.lesson(1, 1)) limit 1),
  '{"value": true}'::jsonb
);

select pg_temp.act_as_owner();

select is(
  (select questions_answered from public.user_stats where user_id = 'aaaa1111-0000-0000-0000-000000000001'),
  1,
  'answering a question increments questions_answered'
);

select is(
  (select questions_correct from public.user_stats where user_id = 'aaaa1111-0000-0000-0000-000000000001'),
  1,
  'and questions_correct when it was right'
);

select pg_temp.act_as('aaaa1111-0000-0000-0000-000000000001');
select public.submit_answer(
  (select * from pg_temp.questions_of(pg_temp.lesson(1, 1)) offset 1 limit 1),
  '{"option_id": "text-editor"}'::jsonb
);
select pg_temp.act_as_owner();

select is(
  (select questions_answered from public.user_stats where user_id = 'aaaa1111-0000-0000-0000-000000000001'),
  2,
  'a wrong answer still counts as answered'
);

select is(
  (select questions_correct from public.user_stats where user_id = 'aaaa1111-0000-0000-0000-000000000001'),
  1,
  'but not as correct — so accuracy means what it says'
);

select is(
  (select questions_answered from public.user_daily_activity
    where user_id = 'aaaa1111-0000-0000-0000-000000000001'),
  2,
  'the day''s activity accumulates both'
);

select is(
  (select xp_earned from public.user_daily_activity
    where user_id = 'aaaa1111-0000-0000-0000-000000000001'),
  5,
  'along with the XP earned that day'
);

select is(
  (select local_date from public.user_daily_activity
    where user_id = 'aaaa1111-0000-0000-0000-000000000001'),
  public.local_date_for('UTC'),
  'keyed on the user''s local date, not a UTC timestamp'
);

-- A user in Auckland at 11pm UTC is already on the next day.
select pg_temp.act_as_owner();
update public.profiles set timezone = 'Pacific/Auckland'
  where id = 'aaaa1111-0000-0000-0000-000000000002';

select pg_temp.act_as('aaaa1111-0000-0000-0000-000000000002');
select public.submit_answer(
  (select * from pg_temp.questions_of(pg_temp.lesson(1, 1)) limit 1),
  '{"value": true}'::jsonb
);
select pg_temp.act_as_owner();

select is(
  (select local_date from public.user_daily_activity
    where user_id = 'aaaa1111-0000-0000-0000-000000000002'),
  public.local_date_for('Pacific/Auckland'),
  'and it follows the user''s timezone, not the server''s'
);

-- ---------------------------------------------------------------------------------------
-- complete_lesson pays once
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('aaaa1111-0000-0000-0000-000000000001');

select is(
  (public.complete_lesson(pg_temp.lesson(1, 1)) ->> 'xp_awarded')::integer,
  20,
  'completing a lesson pays xp_lesson_completion'
);

select is(
  (public.complete_lesson(pg_temp.lesson(1, 1)) ->> 'xp_awarded')::integer,
  0,
  'completing it again pays nothing'
);

select is(
  (public.complete_lesson(pg_temp.lesson(1, 1)) ->> 'already_completed')::boolean,
  true,
  'and says so'
);

select pg_temp.act_as_owner();

select is(
  (select count(*)::int from public.xp_events
    where user_id = 'aaaa1111-0000-0000-0000-000000000001'
      and source_type = 'lesson'),
  1,
  'exactly one lesson ledger row, however many times it is completed'
);

select is(
  (select lessons_completed from public.user_stats
    where user_id = 'aaaa1111-0000-0000-0000-000000000001'),
  1,
  'lessons_completed increments once, not once per completion'
);

select is(
  (select lessons_completed from public.user_daily_activity
    where user_id = 'aaaa1111-0000-0000-0000-000000000001'),
  1,
  'and so does the day''s lesson count'
);

select is(
  (select status::text from public.user_lesson_progress
    where user_id = 'aaaa1111-0000-0000-0000-000000000001'
      and lesson_id = pg_temp.lesson(1, 1)),
  'completed',
  'progress is recorded as completed'
);

-- The timestamp is a record of WHEN it was first completed. Re-reading must not move it.
select pg_temp.act_as_owner();
update public.user_lesson_progress set completed_at = timestamptz '2026-01-01 08:00:00+00'
  where user_id = 'aaaa1111-0000-0000-0000-000000000001' and lesson_id = pg_temp.lesson(1, 1);

select pg_temp.act_as('aaaa1111-0000-0000-0000-000000000001');
select public.complete_lesson(pg_temp.lesson(1, 1));
select pg_temp.act_as_owner();

select is(
  (select completed_at from public.user_lesson_progress
    where user_id = 'aaaa1111-0000-0000-0000-000000000001'
      and lesson_id = pg_temp.lesson(1, 1)),
  timestamptz '2026-01-01 08:00:00+00',
  'and the first completion timestamp is never overwritten'
);

select is(
  (select questions_total from public.user_lesson_progress
    where user_id = 'aaaa1111-0000-0000-0000-000000000001'
      and lesson_id = pg_temp.lesson(1, 1)),
  5,
  'the lesson''s question count is recorded'
);

-- ---------------------------------------------------------------------------------------
-- Perfect lessons (SPEC §25)
-- ---------------------------------------------------------------------------------------

select is(
  (select is_perfect from public.user_lesson_progress
    where user_id = 'aaaa1111-0000-0000-0000-000000000001'
      and lesson_id = pg_temp.lesson(1, 1)),
  false,
  'a lesson with a wrong answer is not perfect'
);

-- The premium user answers every question of lesson 1.2 correctly, first time.
select pg_temp.act_as('aaaa1111-0000-0000-0000-000000000002');

select public.submit_answer(q, pg_temp.answer_for(q))
from pg_temp.questions_of(pg_temp.lesson(1, 2)) q;

select is(
  (public.complete_lesson(pg_temp.lesson(1, 2)) ->> 'is_perfect')::boolean,
  true,
  'every question right on the first attempt is a perfect lesson'
);

select is(
  (public.complete_lesson(pg_temp.lesson(1, 2)) ->> 'first_try_correct')::integer,
  5,
  'and the first-try count is reported'
);

-- Perfect is an achievement already earned; a later re-read must not revoke it.
select public.submit_answer(
  (select * from pg_temp.questions_of(pg_temp.lesson(1, 2)) limit 1),
  '{"value": false}'::jsonb
);
select public.complete_lesson(pg_temp.lesson(1, 2));
select pg_temp.act_as_owner();

select is(
  (select is_perfect from public.user_lesson_progress
    where user_id = 'aaaa1111-0000-0000-0000-000000000002'
      and lesson_id = pg_temp.lesson(1, 2)),
  true,
  'once earned, perfect is kept'
);

-- ---------------------------------------------------------------------------------------
-- get_progress_summary
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('aaaa1111-0000-0000-0000-000000000001');

select is(
  (public.get_progress_summary() ->> 'xp_total')::integer,
  (select xp_total from public.user_stats where user_id = 'aaaa1111-0000-0000-0000-000000000001'),
  'the summary reports the ledger total'
);

select is(
  (public.get_progress_summary() ->> 'lessons_completed')::integer,
  1,
  'and lessons completed'
);

select is(
  (public.get_progress_summary() ->> 'questions_answered')::integer,
  2,
  'and questions answered'
);

select ok(
  jsonb_array_length(public.get_progress_summary() -> 'modules') = 2,
  'every module appears, locked or not'
);

select ok(
  jsonb_array_length(public.get_progress_summary() -> 'skills') > 5,
  'skill areas are reported'
);

select is(
  (public.get_progress_summary() ->> 'is_premium')::boolean,
  false,
  'a free user is told they are not premium'
);

-- SPEC §28: per-skill accuracy is a Premium feature, so it is absent server-side rather than
-- hidden client-side.
select is(
  (public.get_progress_summary() -> 'skills' -> 0 -> 'correct_attempts'),
  'null'::jsonb,
  'a free user gets no per-skill accuracy at all'
);

select ok(
  (public.get_progress_summary() -> 'skills' -> 0 ->> 'question_count')::integer > 0,
  'but does get skill coverage'
);

select pg_temp.act_as('aaaa1111-0000-0000-0000-000000000002');

select isnt(
  (public.get_progress_summary() -> 'skills' -> 0 -> 'correct_attempts'),
  'null'::jsonb,
  'a premium user does get per-skill accuracy'
);

-- ---------------------------------------------------------------------------------------
-- Course completion counts only what the user can reach
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as_owner();
update public.app_config set value = '1'::jsonb where key = 'free_module_count';

select pg_temp.act_as('aaaa1111-0000-0000-0000-000000000001');

select is(
  (public.get_progress_summary() ->> 'lessons_total')::integer,
  4,
  'a free user''s course total counts only unlocked lessons, not the whole catalogue'
);

select throws_ok(
  format($$select public.complete_lesson(%L)$$, pg_temp.lesson(2, 1)),
  '42501',
  null,
  'and they cannot complete a lesson inside a premium module'
);

select pg_temp.act_as('aaaa1111-0000-0000-0000-000000000002');

select is(
  (public.get_progress_summary() ->> 'lessons_total')::integer,
  8,
  'a premium user''s total is the whole course'
);

select pg_temp.act_as_owner();
update public.app_config set value = '6'::jsonb where key = 'free_module_count';

-- ---------------------------------------------------------------------------------------
-- Refusals and grants
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('aaaa1111-0000-0000-0000-000000000001');

select throws_ok(
  $$select public.complete_lesson('00000000-0000-0000-0000-0000000000ff')$$,
  'P0002',
  null,
  'completing a lesson that does not exist is reported as missing'
);

select pg_temp.act_as_owner();

select ok(
  not has_function_privilege('anon', 'public.complete_lesson(uuid)', 'execute'),
  'an unauthenticated caller cannot complete lessons'
);

select ok(
  not has_function_privilege('authenticated', 'public.touch_daily_activity(uuid, integer, integer, integer)', 'execute'),
  'and cannot write daily activity directly'
);

select * from finish();
rollback;

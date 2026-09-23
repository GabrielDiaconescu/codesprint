-- Home, Practice and the Daily Challenge (SPEC §13, §23, §24, Phase 11).
--
-- Two things carry the weight here. Practice must not become a way around the paywall or a
-- way to farm XP, and the Daily Challenge must be claimable exactly once a day — by someone
-- who actually did it.

create extension if not exists pgtap with schema extensions;

begin;
select plan(48);

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

-- `daily_challenge_questions` is internal too: a client must not be able to read tomorrow's
-- challenge. A fixture legitimately needs to.
create or replace function pg_temp.challenge_for(p_uid uuid, p_date date)
returns uuid[] language sql security definer as $$
  select public.daily_challenge_questions(p_uid, p_date);
$$;

-- `mistake_count` is internal — Home calls it, clients do not. A fixture needs to see it.
create or replace function pg_temp.mistakes(p_uid uuid)
returns integer language sql security definer as $$
  select public.mistake_count(p_uid);
$$;

create or replace function pg_temp.today_for(p_uid uuid)
returns date language sql security definer as $$
  select public.local_date_for(coalesce(
    (select p.timezone from public.profiles p where p.id = p_uid), 'UTC'));
$$;

insert into auth.users (id, email) values
  ('cccc3333-0000-0000-0000-0000000000cd', 'free11@test.local'),
  ('cccc3333-0000-0000-0000-0000000000ab', 'prem11@test.local');

insert into public.user_entitlements (user_id, entitlement, is_active)
values ('cccc3333-0000-0000-0000-0000000000ab', 'premium', true);

-- ---------------------------------------------------------------------------------------
-- Home (SPEC §13)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('cccc3333-0000-0000-0000-0000000000cd');

select is(
  (public.get_home_summary() ->> 'is_new')::boolean,
  true,
  'a learner who has finished nothing gets the welcoming state'
);

select is(
  (public.get_home_summary() -> 'next_lesson' ->> 'slug'),
  'what-is-python',
  'and the very first lesson as their next step'
);

select is(
  (public.get_home_summary() -> 'daily_goal' ->> 'target_xp')::integer,
  30,
  'the daily goal is an XP target derived from the chosen minutes'
);

select is(
  (public.get_home_summary() -> 'daily_goal' ->> 'met')::boolean,
  false,
  'and is not met before anything has been earned'
);

-- The free modules' lessons, counted from the catalogue: a module is free when its override
-- says so, or when it has none and sits inside `free_module_count` (SPEC §5, D5).
select is(
  (public.get_home_summary() -> 'course' ->> 'total')::integer,
  (select count(*)::integer
     from public.lessons l
     join public.modules m on m.id = l.module_id
    where l.is_active
      and m.is_active
      and coalesce(
            not m.is_premium_override,
            m.order_index <= (select (value #>> '{}')::integer
                                from public.app_config
                               where key = 'free_module_count')
          )),
  'course totals count the lessons the learner can reach'
);

-- Answer and finish the first lesson.
select public.submit_answer(q, pg_temp.answer_for(q), 'lesson')
from pg_temp.questions_of(pg_temp.lesson(1, 1)) q;
select public.complete_lesson(pg_temp.lesson(1, 1));

select is(
  (public.get_home_summary() ->> 'is_new')::boolean,
  false,
  'after one lesson the welcoming state is gone'
);

select is(
  (public.get_home_summary() -> 'next_lesson' ->> 'slug'),
  'printing',
  'and the next lesson moves on'
);

select is(
  (public.get_home_summary() -> 'daily_goal' ->> 'met')::boolean,
  true,
  'a first lesson meets a 30 XP goal'
);

select is(
  (public.get_home_summary() -> 'course' ->> 'completed')::integer,
  1,
  'course progress counts the completed lesson'
);

-- A free learner's course total shrinks when the boundary moves, and so does "next lesson".
select pg_temp.act_as_owner();
update public.app_config set value = '1'::jsonb where key = 'free_module_count';
select pg_temp.act_as('cccc3333-0000-0000-0000-0000000000cd');

select is(
  (public.get_home_summary() -> 'course' ->> 'total')::integer,
  4,
  'a locked module is not counted in what a free learner has left to do'
);

select pg_temp.act_as_owner();
update public.app_config set value = '6'::jsonb where key = 'free_module_count';

-- ---------------------------------------------------------------------------------------
-- Practice: review mistakes (SPEC §23)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('cccc3333-0000-0000-0000-0000000000cd');

select is(
  pg_temp.mistakes('cccc3333-0000-0000-0000-0000000000cd'),
  0,
  'a learner who has answered everything correctly has nothing to review'
);

select is(
  jsonb_array_length(public.get_practice_set('review') -> 'questions'),
  0,
  'and an empty review set'
);

-- Get one wrong in the second lesson.
select public.submit_answer(
  (select * from pg_temp.questions_of(pg_temp.lesson(1, 2)) limit 1),
  '{"value": "definitely wrong"}'::jsonb,
  'lesson'
);

select is(
  pg_temp.mistakes('cccc3333-0000-0000-0000-0000000000cd'),
  1,
  'a wrong answer becomes something to review'
);

select is(
  jsonb_array_length(public.get_practice_set('review') -> 'questions'),
  1,
  'and appears in the review set'
);

-- Getting it right removes it from review (SPEC §23: review MISTAKES).
select public.submit_answer(
  (select * from pg_temp.questions_of(pg_temp.lesson(1, 2)) limit 1),
  pg_temp.answer_for((select * from pg_temp.questions_of(pg_temp.lesson(1, 2)) limit 1)),
  'practice'
);

select is(
  pg_temp.mistakes('cccc3333-0000-0000-0000-0000000000cd'),
  0,
  'answering it correctly takes it off the review list'
);

-- What a practice question must never contain.
select pg_temp.act_as_owner();
select pg_temp.act_as('cccc3333-0000-0000-0000-0000000000cd');

select public.submit_answer(
  (select * from pg_temp.questions_of(pg_temp.lesson(1, 2)) offset 1 limit 1),
  '{"value": "wrong"}'::jsonb,
  'lesson'
);

select ok(
  public.get_practice_set('review')::text !~ '"explanation"',
  'a practice set carries no explanations'
);

select ok(
  public.get_practice_set('review')::text !~ '"answer"',
  'and no answer keys'
);

select ok(
  (public.get_practice_set('review') -> 'questions' -> 0) ? 'has_hint',
  'but does say whether a hint exists'
);

-- ---------------------------------------------------------------------------------------
-- Practice: mixed and hard (SPEC §23)
-- ---------------------------------------------------------------------------------------

select ok(
  jsonb_array_length(public.get_practice_set('mixed', 20) -> 'questions') > 0,
  'mixed practice draws from completed lessons'
);

select is(
  jsonb_array_length(public.get_practice_set('mixed', 3) -> 'questions'),
  3,
  'and honours the requested size'
);

select throws_ok(
  $$select public.get_practice_set('hard')$$,
  '42501',
  null,
  'hard practice is refused to a free learner (SPEC §23)'
);

select throws_ok(
  $$select public.get_practice_set('nonsense')$$,
  '22023',
  null,
  'an unknown practice mode is refused rather than guessed at'
);

select pg_temp.act_as('cccc3333-0000-0000-0000-0000000000ab');
select public.submit_answer(q, pg_temp.answer_for(q), 'lesson')
from pg_temp.questions_of(pg_temp.lesson(2, 4)) q;
select public.complete_lesson(pg_temp.lesson(2, 4));

select lives_ok(
  $$select public.get_practice_set('hard')$$,
  'a premium learner can open a hard set'
);

select ok(
  (select bool_and((e ->> 'difficulty') = 'hard')
   from jsonb_array_elements(public.get_practice_set('hard', 20) -> 'questions') e),
  'and it contains only hard questions'
);

-- Practice must never reach past the paywall.
select pg_temp.act_as_owner();
update public.app_config set value = '1'::jsonb where key = 'free_module_count';
select pg_temp.act_as('cccc3333-0000-0000-0000-0000000000cd');

-- Fetched AS the learner (get_practice_set reads auth.uid()), then inspected as owner —
-- the join needs tables the learner has no grants on, which is the point.
create temporary table pg_temp_practice_ids on commit drop as
select (e ->> 'id')::uuid as question_id
from jsonb_array_elements(public.get_practice_set('mixed', 20) -> 'questions') e;

select pg_temp.act_as_owner();

select ok(
  not exists (
    select 1
    from pg_temp_practice_ids p
    join public.questions q on q.id = p.question_id
    join public.lessons l on l.id = q.lesson_id
    join public.modules m on m.id = l.module_id
    where m.order_index > 1
  ),
  'practice never offers a question from a module the learner cannot open'
);

update public.app_config set value = '6'::jsonb where key = 'free_module_count';

-- ---------------------------------------------------------------------------------------
-- Practice XP and its daily cap (SPEC §19)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as_owner();
delete from public.xp_events
where user_id = 'cccc3333-0000-0000-0000-0000000000cd' and source_type = 'practice';

select pg_temp.act_as('cccc3333-0000-0000-0000-0000000000cd');

select is(
  (public.submit_answer(
    (select * from pg_temp.questions_of(pg_temp.lesson(1, 3)) limit 1),
    pg_temp.answer_for((select * from pg_temp.questions_of(pg_temp.lesson(1, 3)) limit 1)),
    'practice'
  ) ->> 'xp_awarded')::integer,
  2,
  'a correct practice answer pays xp_practice_correct'
);

select is(
  (public.submit_answer(
    (select * from pg_temp.questions_of(pg_temp.lesson(1, 3)) limit 1),
    pg_temp.answer_for((select * from pg_temp.questions_of(pg_temp.lesson(1, 3)) limit 1)),
    'practice'
  ) ->> 'xp_awarded')::integer,
  0,
  'the same question practised twice in one day pays once'
);

select pg_temp.act_as_owner();

-- Push the learner to one point below the cap and check it truncates rather than refusing.
delete from public.xp_events
where user_id = 'cccc3333-0000-0000-0000-0000000000cd' and source_type = 'practice';
insert into public.xp_events (user_id, source_type, source_id, amount, counts_for_leaderboard, week_start)
values ('cccc3333-0000-0000-0000-0000000000cd', 'practice', 'synthetic', 39, true,
        public.iso_week_start());

select is(
  public.practice_xp_today('cccc3333-0000-0000-0000-0000000000cd'),
  39,
  'practice XP for the day is counted from the ledger'
);

select pg_temp.act_as('cccc3333-0000-0000-0000-0000000000cd');

select is(
  (public.submit_answer(
    (select * from pg_temp.questions_of(pg_temp.lesson(1, 3)) offset 1 limit 1),
    pg_temp.answer_for((select * from pg_temp.questions_of(pg_temp.lesson(1, 3)) offset 1 limit 1)),
    'practice'
  ) ->> 'xp_awarded')::integer,
  1,
  'one point below the cap pays the one point, rather than nothing'
);

select is(
  (public.submit_answer(
    (select * from pg_temp.questions_of(pg_temp.lesson(1, 3)) offset 2 limit 1),
    pg_temp.answer_for((select * from pg_temp.questions_of(pg_temp.lesson(1, 3)) offset 2 limit 1)),
    'practice'
  ) ->> 'xp_awarded')::integer,
  0,
  'and once the cap is reached practice pays nothing more that day'
);

-- ---------------------------------------------------------------------------------------
-- The Daily Challenge (SPEC §24)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('cccc3333-0000-0000-0000-0000000000cd');

select ok(
  jsonb_array_length(public.get_daily_challenge() -> 'questions') > 0,
  'there is always a challenge, with nothing scheduled'
);

select is(
  (public.get_daily_challenge() ->> 'claimed')::boolean,
  false,
  'and it starts unclaimed'
);

select pg_temp.act_as_owner();

select is(
  pg_temp.challenge_for('cccc3333-0000-0000-0000-0000000000cd', date '2026-05-01'),
  pg_temp.challenge_for('cccc3333-0000-0000-0000-0000000000cd', date '2026-05-01'),
  'the same date always produces the same challenge'
);

select isnt(
  pg_temp.challenge_for('cccc3333-0000-0000-0000-0000000000cd', date '2026-05-01'),
  pg_temp.challenge_for('cccc3333-0000-0000-0000-0000000000cd', date '2026-05-02'),
  'and a different date produces a different one'
);

-- A scheduled row wins over the deterministic pick.
insert into public.daily_challenges (challenge_date, question_ids, bonus_xp)
values (
  pg_temp.today_for('cccc3333-0000-0000-0000-0000000000cd'),
  array(select * from pg_temp.questions_of(pg_temp.lesson(1, 1)) limit 2),
  40
);

select is(
  array_length(
    pg_temp.challenge_for(
      'cccc3333-0000-0000-0000-0000000000cd',
      pg_temp.today_for('cccc3333-0000-0000-0000-0000000000cd')),
    1),
  2,
  'a scheduled challenge overrides the deterministic pick'
);

select pg_temp.act_as('cccc3333-0000-0000-0000-0000000000cd');

select is(
  (public.get_daily_challenge() ->> 'bonus_xp')::integer,
  40,
  'and brings its own bonus'
);

-- Claiming without answering is refused.
select throws_ok(
  $$select public.claim_daily_challenge()$$,
  '22023',
  null,
  'the bonus cannot be claimed without finishing the challenge'
);

-- Answer both, in challenge context.
select public.submit_answer(q, pg_temp.answer_for(q), 'challenge')
from unnest(pg_temp.challenge_for(
  'cccc3333-0000-0000-0000-0000000000cd',
  pg_temp.today_for('cccc3333-0000-0000-0000-0000000000cd'))) q;

select is(
  (public.claim_daily_challenge() ->> 'xp_awarded')::integer,
  40,
  'finishing it pays the bonus'
);

select is(
  (public.claim_daily_challenge() ->> 'xp_awarded')::integer,
  0,
  'claiming again pays nothing'
);

select is(
  (public.claim_daily_challenge() ->> 'already_claimed')::boolean,
  true,
  'and says so'
);

select pg_temp.act_as_owner();

select is(
  (select count(*)::int from public.user_daily_challenge_claims
    where user_id = 'cccc3333-0000-0000-0000-0000000000cd'),
  1,
  'exactly one claim row per local date'
);

select is(
  (select count(*)::int from public.xp_events
    where user_id = 'cccc3333-0000-0000-0000-0000000000cd' and source_type = 'challenge'),
  1,
  'and one ledger row'
);

select pg_temp.act_as('cccc3333-0000-0000-0000-0000000000cd');

select is(
  (public.get_home_summary() -> 'challenge' ->> 'claimed')::boolean,
  true,
  'Home knows the challenge is done for today'
);

-- A free learner is never given a Premium question in the challenge (SPEC §24).
select pg_temp.act_as_owner();
delete from public.daily_challenges;
update public.app_config set value = '1'::jsonb where key = 'free_module_count';

select ok(
  not exists (
    select 1
    from unnest(pg_temp.challenge_for(
      'cccc3333-0000-0000-0000-0000000000cd', date '2026-06-15')) qid
    join public.questions q on q.id = qid
    join public.lessons l on l.id = q.lesson_id
    join public.modules m on m.id = l.module_id
    where m.order_index > 1
  ),
  'the challenge never draws from a module a free learner cannot open'
);

update public.app_config set value = '6'::jsonb where key = 'free_module_count';

-- ---------------------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------------------

select ok(
  not has_function_privilege('authenticated', 'public.award_practice_xp(uuid, uuid)', 'execute'),
  'a client cannot award itself practice XP'
);

select ok(
  not has_function_privilege('authenticated', 'public.daily_challenge_questions(uuid, date)', 'execute'),
  'nor read tomorrow''s challenge directly'
);

select ok(
  has_function_privilege('authenticated', 'public.get_home_summary(text)', 'execute'),
  'but can load Home'
);

select ok(
  not has_function_privilege('anon', 'public.claim_daily_challenge()', 'execute'),
  'and an unauthenticated caller can claim nothing'
);

select * from finish();
rollback;

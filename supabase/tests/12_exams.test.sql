-- Exam mode (SPEC §19, §22, §27, §37, Phase 13).
--
-- An exam is the one place in the product where a learner answers a batch of questions with no
-- feedback at all until the end, against a clock the server owns. The assertions that matter
-- are therefore about what is NOT in the paper, what happens when the clock runs out, and that
-- a score can be improved on but never farmed.

create extension if not exists pgtap with schema extensions;

begin;
select plan(64);

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

-- `question_answer_keys` has no client policy at all, which is the point. A fixture has to be
-- able to answer correctly, so it reads the key the way a grading function does.
create or replace function pg_temp.answer_for(p_question uuid)
returns jsonb language sql security definer as $$
  select k.answer from public.question_answer_keys k where k.question_id = p_question;
$$;

/** Every answer right, keyed by question id, for the paper of one attempt. */
create or replace function pg_temp.all_correct(p_attempt uuid)
returns jsonb language sql security definer as $$
  select coalesce(jsonb_object_agg(q::text, pg_temp.answer_for(q)), '{}'::jsonb)
  from public.exam_attempts a, unnest(a.question_ids) q
  where a.id = p_attempt;
$$;

/** The first `p_n` answers right and the rest deliberately wrong. */
create or replace function pg_temp.partly_correct(p_attempt uuid, p_n integer)
returns jsonb language sql security definer as $$
  select coalesce(jsonb_object_agg(
    ids.q::text,
    case when ids.ord <= p_n then pg_temp.answer_for(ids.q) else '{"value":"nope"}'::jsonb end
  ), '{}'::jsonb)
  from public.exam_attempts a,
       unnest(a.question_ids) with ordinality as ids(q, ord)
  where a.id = p_attempt;
$$;

-- Internal by design (no client grant), but a fixture needs to see what the RPC would decide.
create or replace function pg_temp.reason(p_uid uuid, p_exam uuid)
returns text language sql security definer as $$
  select public.exam_unavailable_reason(p_uid, p_exam);
$$;

-- `now()` is frozen inside a transaction, so every attempt in this file shares a `started_at`
-- and "the latest" is not something a timestamp can decide. The OPEN attempt is, so that is
-- what this prefers; the fallback only ever runs when a single submitted attempt is left.
create or replace function pg_temp.attempt_of(p_uid uuid, p_exam uuid)
returns uuid language sql security definer as $$
  select a.id from public.exam_attempts a
  where a.user_id = p_uid and a.exam_id = p_exam
  order by (a.submitted_at is null) desc, a.started_at desc
  limit 1;
$$;

insert into auth.users (id, email) values
  ('bbbb1313-0000-0000-0000-0000000000f1', 'exam-free@test.local'),
  ('bbbb1313-0000-0000-0000-0000000000f2', 'exam-prem@test.local'),
  ('bbbb1313-0000-0000-0000-0000000000f3', 'exam-other@test.local');

insert into public.user_entitlements (user_id, entitlement, is_active)
values ('bbbb1313-0000-0000-0000-0000000000f2', 'premium', true);

-- Adults, so the §41 minor defaults do not interfere with anything here.
update public.profiles set birth_year = 1990
where id in ('bbbb1313-0000-0000-0000-0000000000f1',
             'bbbb1313-0000-0000-0000-0000000000f2',
             'bbbb1313-0000-0000-0000-0000000000f3');

-- ---------------------------------------------------------------------------------------
-- Access (SPEC §5, §27)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('bbbb1313-0000-0000-0000-0000000000f1');

select throws_ok(
  $$select public.start_exam((select id from public.exams where slug = 'python-fundamentals-full'))$$,
  '42501',
  null,
  'the full exam is refused to a free learner, with the paywall''s own error code'
);

select lives_ok(
  $$select public.start_exam((select id from public.exams where slug = 'python-fundamentals-sample'))$$,
  'the sample exam is open to them'
);

select throws_ok(
  $$select public.start_exam('bbbb1313-0000-0000-0000-00000000dead')$$,
  'P0002',
  null,
  'an exam that does not exist is reported as missing'
);

-- ---------------------------------------------------------------------------------------
-- The paper (SPEC §27, §37)
-- ---------------------------------------------------------------------------------------

select is(
  jsonb_array_length(
    public.start_exam((select id from public.exams where slug = 'python-fundamentals-sample'))
      -> 'questions'
  ),
  10,
  'the sample exam is ten questions'
);

select is(
  (public.start_exam((select id from public.exams where slug = 'python-fundamentals-sample'))
     ->> 'resumed')::boolean,
  true,
  'and asking again resumes the attempt already open rather than dealing a new hand'
);

select ok(
  public.start_exam((select id from public.exams where slug = 'python-fundamentals-sample'))::text
    not like '%explanation%',
  'the paper carries no explanation — there is no feedback during an exam (SPEC §27)'
);

select ok(
  public.start_exam((select id from public.exams where slug = 'python-fundamentals-sample'))::text
    not like '%"answer"%',
  'and no answer key, exactly as a lesson or a practice set carries none (SPEC §16)'
);

select ok(
  public.start_exam((select id from public.exams where slug = 'python-fundamentals-sample'))
    -> 'questions' -> 0 ? 'has_hint',
  'a hint is a boolean, never the hint itself'
);

select is(
  public.start_exam((select id from public.exams where slug = 'python-fundamentals-sample'))
    ->> 'expires_at',
  null,
  'the sample exam has no time limit, so there is nothing to expire'
);

select pg_temp.act_as_owner();

select is(
  (select count(distinct q)::integer
   from public.exam_attempts a, unnest(a.question_ids) q
   where a.user_id = 'bbbb1313-0000-0000-0000-0000000000f1'),
  10,
  'no question appears on the paper twice'
);

select ok(
  (select bool_and(q.is_exam_eligible and q.is_active)
   from public.exam_attempts a
   join public.questions q on q.id = any (a.question_ids)
   where a.user_id = 'bbbb1313-0000-0000-0000-0000000000f1'),
  'every question is drawn from the exam-eligible pool'
);

select ok(
  (select count(*) filter (where q.difficulty = 'hard') >= 2
      and count(*) filter (where q.difficulty = 'easy') >= 3
   from public.exam_attempts a
   join public.questions q on q.id = any (a.question_ids)
   where a.user_id = 'bbbb1313-0000-0000-0000-0000000000f1'),
  'the difficulty mix is honoured: thirty easy questions is not the same exam (SPEC §37)'
);

-- ---------------------------------------------------------------------------------------
-- Saving mid-exam (SPEC §27, §36)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('bbbb1313-0000-0000-0000-0000000000f1');

select lives_ok(
  format(
    $$select public.save_exam_progress(%L, '{"deadbeef-0000-4000-8000-000000000000": {"value": 1}}'::jsonb)$$,
    pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f1',
                       (select id from public.exams where slug = 'python-fundamentals-sample'))
  ),
  'answers can be saved while the exam is still open'
);

select is(
  (select jsonb_object_keys(a.answers) from public.exam_attempts a
   where a.id = pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f1',
     (select id from public.exams where slug = 'python-fundamentals-sample'))),
  'deadbeef-0000-4000-8000-000000000000',
  'and they land on the attempt, so a crash does not cost the whole exam'
);

select is(
  (public.start_exam((select id from public.exams where slug = 'python-fundamentals-sample'))
     -> 'saved_answers' -> 'deadbeef-0000-4000-8000-000000000000' ->> 'value'),
  '1',
  'a resumed paper hands the saved answers back'
);

select throws_ok(
  format($$select public.save_exam_progress(%L, '"not an object"'::jsonb)$$,
         pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f1',
           (select id from public.exams where slug = 'python-fundamentals-sample'))),
  '22023',
  null,
  'a malformed payload is refused rather than stored'
);

-- Another learner's attempt: the update simply matches nothing.
select pg_temp.act_as('bbbb1313-0000-0000-0000-0000000000f3');

select lives_ok(
  format($$select public.save_exam_progress(%L, '{"x": 1}'::jsonb)$$,
         pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f1',
           (select id from public.exams where slug = 'python-fundamentals-sample'))),
  'writing to somebody else''s attempt does not raise'
);

select pg_temp.act_as_owner();

select ok(
  not (select a.answers ? 'x' from public.exam_attempts a
       where a.user_id = 'bbbb1313-0000-0000-0000-0000000000f1'),
  '...and does not write anything either'
);

-- ---------------------------------------------------------------------------------------
-- Grading (SPEC §27)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('bbbb1313-0000-0000-0000-0000000000f1');

select is(
  (public.submit_exam(
     pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f1',
       (select id from public.exams where slug = 'python-fundamentals-sample')),
     pg_temp.all_correct(pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f1',
       (select id from public.exams where slug = 'python-fundamentals-sample')))
   ) ->> 'score_pct')::numeric,
  100.00,
  'every answer right scores 100%'
);

select ok(
  (public.get_exam_results(pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f1',
     (select id from public.exams where slug = 'python-fundamentals-sample'))) ->> 'passed')::boolean,
  'which passes a 70% threshold'
);

select ok(
  public.get_exam_results(pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f1',
    (select id from public.exams where slug = 'python-fundamentals-sample')))::text
    like '%explanation%',
  'the results page DOES carry the explanations — the exam is over (SPEC §27)'
);

select ok(
  public.get_exam_results(pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f1',
    (select id from public.exams where slug = 'python-fundamentals-sample')))
    -> 'questions' -> 0 ? 'correct_answer',
  'and the correct answer, now that the learner has committed to theirs'
);

select ok(
  jsonb_typeof(public.get_exam_results(pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f1',
    (select id from public.exams where slug = 'python-fundamentals-sample'))) -> 'skill_breakdown')
    = 'object',
  'the weak-areas breakdown is computed from the skill tags of this paper (SPEC §28)'
);

select is(
  (public.get_exam_results(pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f1',
    (select id from public.exams where slug = 'python-fundamentals-sample')))
    ->> 'xp_awarded')::integer,
  0,
  'reopening results reports no XP: it was paid once, at submission'
);

select pg_temp.act_as_owner();

select is(
  (select count(*)::integer from public.user_question_attempts
   where user_id = 'bbbb1313-0000-0000-0000-0000000000f1' and context = 'exam'),
  10,
  'every exam answer is recorded as an attempt, so it reaches progress and review (SPEC §23, §28)'
);

select is(
  (select sum(amount)::integer from public.xp_events
   where user_id = 'bbbb1313-0000-0000-0000-0000000000f1' and source_type = 'exam'),
  100,
  '100% of a 100 XP maximum pays 100 XP (SPEC §19)'
);

select ok(
  (select xp_total from public.user_stats where user_id = 'bbbb1313-0000-0000-0000-0000000000f1') > 100,
  'and the achievements it unlocked pay on top, through the same ledger (SPEC §25)'
);

select is(
  (select questions_answered from public.user_daily_activity
   where user_id = 'bbbb1313-0000-0000-0000-0000000000f1'
     and local_date = public.local_date_for('UTC')),
  10,
  'and the exam counts towards the day, so it can carry a streak (SPEC §21)'
);

-- ---------------------------------------------------------------------------------------
-- Idempotency and attempt limits (SPEC §27, §42)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('bbbb1313-0000-0000-0000-0000000000f1');

select is(
  (public.submit_exam(
     pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f1',
       (select id from public.exams where slug = 'python-fundamentals-sample')),
     pg_temp.all_correct(pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f1',
       (select id from public.exams where slug = 'python-fundamentals-sample')))
   ) ->> 'xp_awarded')::integer,
  0,
  'resubmitting the same attempt pays nothing'
);

select pg_temp.act_as_owner();

select is(
  (select count(*)::integer from public.xp_events
   where user_id = 'bbbb1313-0000-0000-0000-0000000000f1' and source_type = 'exam'),
  1,
  'and writes no second ledger row'
);

select is(
  (select count(*)::integer from public.user_question_attempts
   where user_id = 'bbbb1313-0000-0000-0000-0000000000f1' and context = 'exam'),
  10,
  'nor a second set of attempts'
);

select pg_temp.act_as('bbbb1313-0000-0000-0000-0000000000f1');

select throws_ok(
  $$select public.start_exam((select id from public.exams where slug = 'python-fundamentals-sample'))$$,
  '22023',
  null,
  'a free learner gets one go a week at the sample exam (SPEC §5)'
);

select is(
  pg_temp.reason('bbbb1313-0000-0000-0000-0000000000f1',
    (select id from public.exams where slug = 'python-fundamentals-sample')),
  'no_attempts_left',
  'and the overview greys it out for exactly that reason, so the screen never lets them tap'
);

-- ---------------------------------------------------------------------------------------
-- XP is the improvement over your best (SPEC §19)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('bbbb1313-0000-0000-0000-0000000000f2');

-- Started in its own statement: PostgreSQL does not promise an evaluation order for
-- function arguments, so `attempt_of` could otherwise read the PREVIOUS attempt.
select public.start_exam((select id from public.exams where slug = 'python-fundamentals-full'));

select is(
  (public.submit_exam(
     pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f2', (select id from public.exams where slug = 'python-fundamentals-full')),
     pg_temp.partly_correct(pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f2', (select id from public.exams where slug = 'python-fundamentals-full')), 15)
   ) ->> 'xp_awarded')::integer,
  50,
  'a first exam at 50% pays half the maximum'
);

-- Started in its own statement: PostgreSQL does not promise an evaluation order for
-- function arguments, so `attempt_of` could otherwise read the PREVIOUS attempt.
select public.start_exam((select id from public.exams where slug = 'python-fundamentals-full'));

select is(
  (public.submit_exam(
     pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f2', (select id from public.exams where slug = 'python-fundamentals-full')),
     pg_temp.partly_correct(pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f2', (select id from public.exams where slug = 'python-fundamentals-full')), 24)
   ) ->> 'xp_awarded')::integer,
  30,
  'improving to 80% pays only the 30 points of improvement, never the whole score again'
);

-- Started in its own statement: PostgreSQL does not promise an evaluation order for
-- function arguments, so `attempt_of` could otherwise read the PREVIOUS attempt.
select public.start_exam((select id from public.exams where slug = 'python-fundamentals-full'));

select is(
  (public.submit_exam(
     pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f2', (select id from public.exams where slug = 'python-fundamentals-full')),
     pg_temp.partly_correct(pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f2', (select id from public.exams where slug = 'python-fundamentals-full')), 9)
   ) ->> 'xp_awarded')::integer,
  0,
  'and a worse attempt pays nothing — an exam cannot be farmed by resitting it'
);

select pg_temp.act_as_owner();

select is(
  (select sum(amount)::integer from public.xp_events
   where user_id = 'bbbb1313-0000-0000-0000-0000000000f2' and source_type = 'exam'),
  80,
  'the exam ledger totals the BEST result, not the sum of every sitting'
);

select is(
  (select lives from public.user_stats where user_id = 'bbbb1313-0000-0000-0000-0000000000f2'),
  public.config_int('lives_max', 5),
  'and no life was spent on any of those wrong answers — exams limit attempts instead (SPEC §22)'
);

-- ---------------------------------------------------------------------------------------
-- The clock (SPEC §27)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('bbbb1313-0000-0000-0000-0000000000f2');

-- A fresh attempt, one answer saved in time.
select public.start_exam((select id from public.exams where slug = 'python-fundamentals-full'));

select public.save_exam_progress(
  pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f2',
    (select id from public.exams where slug = 'python-fundamentals-full')),
  pg_temp.partly_correct(
    pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f2',
      (select id from public.exams where slug = 'python-fundamentals-full')), 30)
);

select is(
  (select (a.expires_at - a.started_at)::text from public.exam_attempts a
   where a.id = pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f2',
     (select id from public.exams where slug = 'python-fundamentals-full'))),
  '00:45:00',
  'the full exam''s deadline is set from the exam''s own time limit, on the server'
);

select pg_temp.act_as_owner();

-- Back-date the deadline well past the grace period. `now()` is frozen inside a transaction,
-- so the clock has to be moved rather than waited out.
update public.exam_attempts
set expires_at = now() - interval '10 minutes'
where id = pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f2',
  (select id from public.exams where slug = 'python-fundamentals-full'));

select pg_temp.act_as('bbbb1313-0000-0000-0000-0000000000f2');

select is(
  (public.submit_exam(
     pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f2',
       (select id from public.exams where slug = 'python-fundamentals-full')),
     pg_temp.partly_correct(
       pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f2',
         (select id from public.exams where slug = 'python-fundamentals-full')), 0)
   ) ->> 'score_pct')::numeric,
  100.00,
  'a payload arriving after the grace period is ignored; what was saved in time is marked'
);

select pg_temp.act_as_owner();

update public.exam_attempts
set expires_at = now() - interval '10 seconds', submitted_at = null, score_pct = null
where id = pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f2',
  (select id from public.exams where slug = 'python-fundamentals-full'));

select pg_temp.act_as('bbbb1313-0000-0000-0000-0000000000f2');

select is(
  (public.submit_exam(
     pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f2',
       (select id from public.exams where slug = 'python-fundamentals-full')),
     pg_temp.partly_correct(
       pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f2',
         (select id from public.exams where slug = 'python-fundamentals-full')), 0)
   ) ->> 'score_pct')::numeric,
  0.00,
  'ten seconds late is inside the grace, and that payload counts — slow connections are not cheating'
);

-- An expired attempt left open is graded, not resumed.
select pg_temp.act_as_owner();

delete from public.exam_attempts where user_id = 'bbbb1313-0000-0000-0000-0000000000f2';
delete from public.xp_events where user_id = 'bbbb1313-0000-0000-0000-0000000000f2';

select pg_temp.act_as('bbbb1313-0000-0000-0000-0000000000f2');
select public.start_exam((select id from public.exams where slug = 'python-fundamentals-full'));
select pg_temp.act_as_owner();

update public.exam_attempts
set expires_at = now() - interval '1 hour'
where user_id = 'bbbb1313-0000-0000-0000-0000000000f2';

select pg_temp.act_as('bbbb1313-0000-0000-0000-0000000000f2');

select is(
  (public.start_exam((select id from public.exams where slug = 'python-fundamentals-full'))
     ->> 'resumed')::boolean,
  false,
  'an attempt whose clock ran out is not resumed — time running out is a result, not a pause'
);

select pg_temp.act_as_owner();

select is(
  (select count(*)::integer from public.exam_attempts
   where user_id = 'bbbb1313-0000-0000-0000-0000000000f2' and submitted_at is not null),
  1,
  'the expired one was graded on the way past'
);

-- ---------------------------------------------------------------------------------------
-- Unanswered, malformed and missing (SPEC §46)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('bbbb1313-0000-0000-0000-0000000000f2');

select is(
  (public.submit_exam(
     pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f2',
       (select id from public.exams where slug = 'python-fundamentals-full')),
     '{}'::jsonb
   ) ->> 'score_pct')::numeric,
  0.00,
  'an unanswered paper scores zero rather than failing to submit'
);

select pg_temp.act_as_owner();
delete from public.exam_attempts where user_id = 'bbbb1313-0000-0000-0000-0000000000f2';
select pg_temp.act_as('bbbb1313-0000-0000-0000-0000000000f2');

select lives_ok(
  $$select public.submit_exam(
      (public.start_exam((select id from public.exams where slug = 'python-fundamentals-full'))
        ->> 'attempt_id')::uuid,
      '{"not-a-uuid": "nonsense", "12345678-0000-4000-8000-000000000000": 42}'::jsonb)$$,
  'a nonsense payload grades as wrong rather than breaking the submission'
);

select throws_ok(
  $$select public.submit_exam('bbbb1313-0000-0000-0000-00000000dead', '{}'::jsonb)$$,
  'P0002',
  null,
  'an attempt that does not exist is reported as missing'
);

-- ---------------------------------------------------------------------------------------
-- One learner's attempt is nobody else's (SPEC §40)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('bbbb1313-0000-0000-0000-0000000000f3');

select throws_ok(
  format($$select public.get_exam_results(%L)$$,
         pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f1',
           (select id from public.exams where slug = 'python-fundamentals-sample'))),
  'P0002',
  null,
  'another learner''s results read as missing, not as forbidden — which would confirm the id'
);

select throws_ok(
  format($$select public.submit_exam(%L, '{}'::jsonb)$$,
         pg_temp.attempt_of('bbbb1313-0000-0000-0000-0000000000f1',
           (select id from public.exams where slug = 'python-fundamentals-sample'))),
  'P0002',
  null,
  'and it cannot be submitted by them either'
);

select is(
  (select count(*)::integer from public.exam_attempts),
  (select count(*)::integer from public.exam_attempts
   where user_id in ('bbbb1313-0000-0000-0000-0000000000f1', 'bbbb1313-0000-0000-0000-0000000000f2')),
  'RLS shows a learner only their own attempts'
);

-- ---------------------------------------------------------------------------------------
-- Results of an unfinished attempt (SPEC §27)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as_owner();
delete from public.exam_attempts where user_id = 'bbbb1313-0000-0000-0000-0000000000f2';
select pg_temp.act_as('bbbb1313-0000-0000-0000-0000000000f2');

select throws_ok(
  format($$select public.get_exam_results(%L)$$,
         (public.start_exam((select id from public.exams where slug = 'python-fundamentals-full'))
            ->> 'attempt_id')::uuid),
  'P0002',
  null,
  'results cannot be read for an exam still being sat — that would be the answer key'
);

-- ---------------------------------------------------------------------------------------
-- The overview (SPEC §27)
-- ---------------------------------------------------------------------------------------

select is(
  jsonb_array_length(public.get_exam_overview('en') -> 'exams'),
  2,
  'the overview lists every active exam'
);

select is(
  (public.get_exam_overview('en') -> 'exams' -> 0 ->> 'question_count')::integer,
  10,
  'shortest first, so the sample exam is the obvious starting point'
);

select ok(
  public.get_exam_overview('en') -> 'exams' -> 1 ->> 'open_attempt_id' is not null,
  'and it carries the open attempt, so the learner can be offered "resume"'
);

select pg_temp.act_as('bbbb1313-0000-0000-0000-0000000000f1');

select is(
  (public.get_exam_overview('en') -> 'exams' -> 0 ->> 'best_score_pct')::numeric,
  100.00,
  'the overview remembers a learner''s best score'
);

select is(
  (public.get_exam_overview('en') -> 'exams' -> 1 ->> 'unavailable_reason'),
  'requires_premium',
  'and tells a free learner that the full exam is the paid one'
);

select is(
  (public.get_exam_overview('en') ->> 'best_xp')::integer,
  100,
  'best_xp is what the learner has banked from exams so far'
);

-- ---------------------------------------------------------------------------------------
-- Config-driven refusals (SPEC §50)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as_owner();

update public.app_config set value = 'false'::jsonb where key = 'exams_enabled';

select is(
  pg_temp.reason('bbbb1313-0000-0000-0000-0000000000f2',
    (select id from public.exams where slug = 'python-fundamentals-full')),
  'disabled',
  'the kill switch closes exams for everybody, without a deploy (SPEC §50)'
);

update public.app_config set value = 'true'::jsonb where key = 'exams_enabled';

update public.app_config set value = '24'::jsonb where key = 'exam_retry_cooldown_hours';

select is(
  pg_temp.reason('bbbb1313-0000-0000-0000-0000000000f1',
    (select id from public.exams where slug = 'python-fundamentals-sample')),
  'no_attempts_left',
  'a free learner is limited by attempts per week, not by the retry cooldown'
);

update public.app_config set value = '0'::jsonb where key = 'exam_retry_cooldown_hours';

insert into public.exams (course_id, slug, title, question_count, pass_threshold_pct)
select c.id, 'impossible-exam', '{"en":"Impossible"}'::jsonb, 9999, 70
from public.courses c limit 1;

select is(
  pg_temp.reason('bbbb1313-0000-0000-0000-0000000000f2',
    (select id from public.exams where slug = 'impossible-exam')),
  'pool_too_small',
  'an exam asking for more questions than exist says so, rather than dealing a short paper'
);

select pg_temp.act_as('bbbb1313-0000-0000-0000-0000000000f2');

select throws_ok(
  $$select public.start_exam((select id from public.exams where slug = 'impossible-exam'))$$,
  '22023',
  null,
  'and refuses to start'
);

-- ---------------------------------------------------------------------------------------
-- Grants (SPEC §40)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as_owner();

select ok(
  has_function_privilege('authenticated', 'public.start_exam(uuid, text)', 'execute')
    and has_function_privilege('authenticated', 'public.submit_exam(uuid, jsonb, text)', 'execute')
    and has_function_privilege('authenticated', 'public.save_exam_progress(uuid, jsonb)', 'execute')
    and has_function_privilege('authenticated', 'public.get_exam_overview(text)', 'execute')
    and has_function_privilege('authenticated', 'public.get_exam_results(uuid, text)', 'execute'),
  'the five RPCs the app calls are executable by a signed-in learner'
);

select ok(
  not has_function_privilege('anon', 'public.start_exam(uuid, text)', 'execute')
    and not has_function_privilege('anon', 'public.submit_exam(uuid, jsonb, text)', 'execute'),
  'and by nobody who is not signed in'
);

select ok(
  not has_function_privilege('authenticated', 'public.exam_question_set(uuid, uuid)', 'execute')
    and not has_function_privilege('authenticated', 'public.exam_questions(uuid, text)', 'execute')
    and not has_function_privilege('authenticated', 'public.exam_unavailable_reason(uuid, uuid)', 'execute'),
  'the internals stay internal: a client cannot deal itself a paper outside an attempt'
);

select ok(
  not has_function_privilege('authenticated', 'public.exam_results(uuid, text, integer, jsonb)', 'execute'),
  'and cannot call the results builder with an XP figure of its own choosing'
);

select * from finish();
rollback;

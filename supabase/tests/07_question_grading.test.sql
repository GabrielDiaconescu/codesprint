-- The question engine's server side (SPEC §16, §18, §19, §42, Phase 8).
--
-- Graded against the REAL seeded questions rather than fixtures, so a change to the content
-- format that broke grading would fail here rather than in a learner's hands. The XP rules
-- are asserted in the same file because grading and rewarding happen in one transaction, and
-- the interesting bugs live at their boundary: paying twice, paying for practice, paying full
-- rate on a retry.

create extension if not exists pgtap with schema extensions;

begin;
select plan(57);

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

-- Seeded question ids, by type. Pinned here so a renamed fixture fails loudly.
create or replace function pg_temp.q(p_kind text) returns uuid language sql as $$
  select case p_kind
    when 'true_false'         then 'a1a77c7f-c0a4-4320-8fd0-734d9d9d895a'::uuid -- easy, no hint
    when 'multiple_choice'    then 'f931c8e5-5cf2-41f0-95c0-8ee0f585bb40'::uuid -- easy, has hint
    when 'predict_output'     then '2f2a58fa-0c26-4b3d-9b20-825ea7d3be34'::uuid -- easy, trimmed
    when 'multiple_select'    then '87b202d9-5f8a-4f33-a208-81b1775a74b9'::uuid -- medium
    when 'fill_blank'         then 'fb9e4bbf-0fd7-435f-b470-ff2be737db00'::uuid -- easy
    when 'code_ordering'      then 'd6ea8906-8c5b-4c72-9627-e468f1ab4180'::uuid -- medium
    when 'debugging'          then 'cf7fcce7-ca2c-446d-8acc-a9827967786e'::uuid -- medium
    when 'concept_matching'   then '6ab13905-9dd5-48b5-b9de-3e36cc96ac0a'::uuid -- medium
    when 'hard'               then '184ed59e-ff4f-47c2-a320-351d98580148'::uuid -- debugging, hard
    when 'module2'            then '04e705b8-a2ca-4e5e-8821-084eed62ab28'::uuid -- predict_output, module 2
  end;
$$;

insert into auth.users (id, email) values
  ('ffff0000-0000-0000-0000-000000000001', 'grader-free@test.local'),
  ('ffff0000-0000-0000-0000-000000000002', 'grader-premium@test.local');

insert into public.user_entitlements (user_id, entitlement, is_active)
values ('ffff0000-0000-0000-0000-000000000002', 'premium', true);

-- ---------------------------------------------------------------------------------------
-- Text normalisation (SPEC §16)
-- ---------------------------------------------------------------------------------------

select is(
  public.normalize_answer_text('‘Python’', 'exact'),
  '''Python''',
  'curly single quotes become straight ones, in every mode'
);

select is(
  public.normalize_answer_text('“34”', 'exact'),
  '"34"',
  'curly double quotes become straight ones'
);

select is(
  public.normalize_answer_text('a – b — c', 'exact'),
  'a - b - c',
  'typographic dashes become hyphens'
);

select is(
  public.normalize_answer_text('  Python  ', 'exact'),
  '  Python  ',
  'exact keeps surrounding whitespace'
);

select is(
  public.normalize_answer_text(E'  Python\n', 'trimmed'),
  'Python',
  'trimmed strips spaces and newlines at both ends'
);

select is(
  public.normalize_answer_text('Hello    World  ', 'whitespace_insensitive'),
  'Hello World',
  'whitespace_insensitive collapses runs and trims'
);

select is(
  public.normalize_answer_text('  PyThOn ', 'case_insensitive'),
  'python',
  'case_insensitive trims and lowercases'
);

select is(
  public.normalize_answer_text(null, 'trimmed'),
  '',
  'a null answer normalises to an empty string rather than raising'
);

-- ---------------------------------------------------------------------------------------
-- Each grader: right, wrong, malformed
-- ---------------------------------------------------------------------------------------

select is(public.grade_answer(pg_temp.q('true_false'), '{"value": true}'), true,
  'true_false: the right boolean');
select is(public.grade_answer(pg_temp.q('true_false'), '{"value": false}'), false,
  'true_false: the wrong boolean');
select is(public.grade_answer(pg_temp.q('true_false'), '{"value": "true"}'), false,
  'true_false: the string "true" is not the boolean true');

select is(public.grade_answer(pg_temp.q('multiple_choice'), '{"option_id": "reads-and-runs"}'), true,
  'multiple_choice: the right option');
select is(public.grade_answer(pg_temp.q('multiple_choice'), '{"option_id": "text-editor"}'), false,
  'multiple_choice: a wrong option');
select is(public.grade_answer(pg_temp.q('multiple_choice'), '{}'), false,
  'multiple_choice: a missing option grades as wrong, not as an error');

select is(
  public.grade_answer(pg_temp.q('multiple_select'),
    '{"option_ids": ["plain-text", "reads-like-english", "runs-top-to-bottom"]}'),
  true,
  'multiple_select: the right set, in a different order'
);
select is(
  public.grade_answer(pg_temp.q('multiple_select'),
    '{"option_ids": ["reads-like-english", "runs-top-to-bottom"]}'),
  false,
  'multiple_select: a subset is wrong — all-or-nothing (SPEC §16)'
);
select is(
  public.grade_answer(pg_temp.q('multiple_select'),
    '{"option_ids": ["reads-like-english", "runs-top-to-bottom", "plain-text", "needs-compiling"]}'),
  false,
  'multiple_select: one extra wrong option spoils it'
);
select is(public.grade_answer(pg_temp.q('multiple_select'), '{"option_ids": "plain-text"}'), false,
  'multiple_select: a non-array grades as wrong');

select is(public.grade_answer(pg_temp.q('predict_output'), '{"value": "Python"}'), true,
  'predict_output: the exact output');
select is(public.grade_answer(pg_temp.q('predict_output'), E'{"value": "  Python\\n"}'), true,
  'predict_output: surrounding whitespace is forgiven under trimmed');
select is(public.grade_answer(pg_temp.q('predict_output'), '{"value": "python"}'), false,
  'predict_output: case still matters under trimmed');
select is(public.grade_answer(pg_temp.q('predict_output'), '{"value": "‘Python’"}'), false,
  'predict_output: stray quotes are wrong even after straightening');

select is(public.grade_answer(pg_temp.q('fill_blank'), '{"value": "print"}'), true,
  'fill_blank: the right token');
select is(public.grade_answer(pg_temp.q('fill_blank'), '{"value": "show"}'), false,
  'fill_blank: a wrong token');

select is(
  public.grade_answer(pg_temp.q('code_ordering'), '{"order": ["three", "two", "one", "go"]}'),
  true,
  'code_ordering: the right sequence'
);
select is(
  public.grade_answer(pg_temp.q('code_ordering'), '{"order": ["go", "three", "two", "one"]}'),
  false,
  'code_ordering: the same lines in the wrong order'
);
select is(
  public.grade_answer(pg_temp.q('code_ordering'), '{"order": ["three", "two", "one"]}'),
  false,
  'code_ordering: a missing line'
);

select is(public.grade_answer(pg_temp.q('debugging'), '{"line_id": "greeting"}'), true,
  'debugging: the faulty line');
select is(public.grade_answer(pg_temp.q('debugging'), '{"line_id": "total"}'), false,
  'debugging: an innocent line');

select is(
  public.grade_answer(pg_temp.q('concept_matching'),
    '{"pairs": {"type": "wrong-kind", "syntax": "not-valid-python", "name": "never-seen"}}'),
  true,
  'concept_matching: the right pairs, keys in a different order'
);
select is(
  public.grade_answer(pg_temp.q('concept_matching'),
    '{"pairs": {"syntax": "never-seen", "name": "not-valid-python", "type": "wrong-kind"}}'),
  false,
  'concept_matching: two pairs swapped'
);
select is(
  public.grade_answer(pg_temp.q('concept_matching'),
    '{"pairs": {"syntax": "not-valid-python", "name": "never-seen"}}'),
  false,
  'concept_matching: one pair missing'
);

-- Alternative phrasings the author allowed.
select pg_temp.act_as_owner();
update public.question_answer_keys
  set accepted_answers = '["Python!"]'::jsonb
  where question_id = pg_temp.q('predict_output');

select is(public.grade_answer(pg_temp.q('predict_output'), '{"value": "Python!"}'), true,
  'an accepted alternative answer is graded correct');

update public.question_answer_keys
  set accepted_answers = '[]'::jsonb
  where question_id = pg_temp.q('predict_output');

-- ---------------------------------------------------------------------------------------
-- submit_answer: the verdict and what comes with it
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('ffff0000-0000-0000-0000-000000000001');

select is(
  (public.submit_answer(pg_temp.q('true_false'), '{"value": true}') ->> 'correct')::boolean,
  true,
  'a correct answer is reported correct'
);

select is(
  (public.submit_answer(pg_temp.q('multiple_choice'), '{"option_id": "text-editor"}') ->> 'correct')::boolean,
  false,
  'a wrong answer is reported wrong'
);

select ok(
  length(public.submit_answer(pg_temp.q('multiple_choice'), '{"option_id": "text-editor"}') ->> 'explanation') > 25,
  'the explanation comes back after a wrong answer (SPEC §18)'
);

select ok(
  length(public.submit_answer(pg_temp.q('multiple_choice'), '{"option_id": "reads-and-runs"}') ->> 'explanation') > 25,
  'and after a correct one'
);

select is(
  public.submit_answer(pg_temp.q('multiple_choice'), '{"option_id": "text-editor"}') ->> 'hint',
  'Think about which one does something when you press "run".',
  'the hint is returned when the question has one'
);

select is(
  public.submit_answer(pg_temp.q('true_false'), '{"value": true}') -> 'hint',
  'null'::jsonb,
  'and is null when it does not'
);

select is(
  public.submit_answer(pg_temp.q('multiple_choice'), '{"option_id": "text-editor"}') -> 'solution',
  '{"option_id": "reads-and-runs"}'::jsonb,
  'the correct answer is released after an attempt, so the renderer can mark it (SPEC §18)'
);

-- ---------------------------------------------------------------------------------------
-- XP (SPEC §19)
-- ---------------------------------------------------------------------------------------
--
-- The free user above has now answered true_false correctly once (attempt 1, easy, 5 XP) and
-- multiple_choice several times. Everything below builds on that history.

select is(
  (select amount from public.xp_events
    where user_id = 'ffff0000-0000-0000-0000-000000000001'
      and source_type = 'question'
      and source_id = pg_temp.q('true_false')::text),
  5,
  'an easy question correct on the first attempt pays 5 XP through the ledger'
);

select is(
  (public.submit_answer(pg_temp.q('true_false'), '{"value": true}') ->> 'xp_awarded')::integer,
  0,
  'answering the same question correctly again pays nothing'
);

select is(
  (select count(*)::int from public.xp_events
    where user_id = 'ffff0000-0000-0000-0000-000000000001'
      and source_id = pg_temp.q('true_false')::text),
  1,
  'and leaves exactly one ledger row'
);

-- multiple_choice was answered wrong first (attempt 1), then right: a retry.
select is(
  (select amount from public.xp_events
    where user_id = 'ffff0000-0000-0000-0000-000000000001'
      and source_id = pg_temp.q('multiple_choice')::text),
  2,
  'an easy question correct on a retry pays floor(5 * 0.5) = 2 XP'
);

select is(
  (public.submit_answer(pg_temp.q('hard'), '{"line_id": "show"}') ->> 'xp_awarded')::integer,
  15,
  'a hard question correct first time pays 15 XP'
);

-- Practice pays by its own rule, not the question's: 2 XP flat, capped daily (SPEC §19, §23).
-- Phase 11 introduced it; before then this paid nothing.
select is(
  (public.submit_answer(pg_temp.q('fill_blank'), '{"value": "print"}', 'practice') ->> 'xp_awarded')::integer,
  2,
  'practice pays the flat practice rate, not the question difficulty rate'
);

select is(
  (public.submit_answer(pg_temp.q('fill_blank'), '{"value": "print"}', 'lesson') ->> 'attempt_no')::integer,
  2,
  'attempts are counted across contexts, so a lesson answer after a practice one is attempt 2'
);

-- ---------------------------------------------------------------------------------------
-- Attempts are recorded
-- ---------------------------------------------------------------------------------------

select is(
  (select count(*)::int from public.user_question_attempts
    where user_id = 'ffff0000-0000-0000-0000-000000000001'
      and question_id = pg_temp.q('multiple_choice')),
  5,
  'every submission is recorded as an attempt'
);

select is(
  (select submitted_answer from public.user_question_attempts
    where user_id = 'ffff0000-0000-0000-0000-000000000001'
      and question_id = pg_temp.q('hard')),
  '{"line_id": "show"}'::jsonb,
  'with what was actually submitted'
);

-- max() rather than "order by created_at": inside a test transaction now() is frozen, so
-- every row carries the same timestamp and ordering by it is a coin toss.
select is(
  (select max(attempt_no) from public.user_question_attempts
    where user_id = 'ffff0000-0000-0000-0000-000000000001'
      and question_id = pg_temp.q('true_false')),
  3,
  'and a running attempt number'
);

-- ---------------------------------------------------------------------------------------
-- Refusals
-- ---------------------------------------------------------------------------------------

select throws_ok(
  $$select public.submit_answer(pg_temp.q('true_false'), '"just a string"'::jsonb)$$,
  '22023',
  null,
  'a non-object answer is refused rather than graded'
);

select throws_ok(
  $$select public.submit_answer('00000000-0000-0000-0000-0000000000ff', '{}'::jsonb)$$,
  'P0002',
  null,
  'a question that does not exist is reported missing'
);

select pg_temp.act_as_owner();
update public.app_config set value = '1'::jsonb where key = 'free_module_count';
select pg_temp.act_as('ffff0000-0000-0000-0000-000000000001');

select throws_ok(
  $$select public.submit_answer(pg_temp.q('module2'), '{"value": "Cluj"}'::jsonb)$$,
  '42501',
  null,
  'a free user cannot answer inside a premium module'
);

select pg_temp.act_as('ffff0000-0000-0000-0000-000000000002');

select is(
  (public.submit_answer(pg_temp.q('module2'), '{"value": "Cluj"}') ->> 'correct')::boolean,
  true,
  'a premium user can'
);

select pg_temp.act_as_owner();
update public.app_config set value = '6'::jsonb where key = 'free_module_count';

select ok(
  not has_function_privilege('anon', 'public.submit_answer(uuid, jsonb, public.answer_context, text)', 'execute'),
  'an unauthenticated caller cannot submit answers'
);

select ok(
  not has_function_privilege('authenticated', 'public.grade_answer(uuid, jsonb)', 'execute'),
  'the grader is internal: a client cannot probe answers without recording an attempt'
);

select ok(
  not has_function_privilege('authenticated', 'public.question_xp(uuid, integer)', 'execute'),
  'and cannot read XP values ahead of answering'
);

select * from finish();
rollback;

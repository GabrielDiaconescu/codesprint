-- The RLS access matrix from SPEC §40, proven for all five roles:
-- anonymous request, guest (anonymous sign-in), free user, premium user, and another user.
--
-- The NEGATIVE cases are the point. It is easy to check that a user can read their own row;
-- what actually protects the product is that they cannot read anyone else's, cannot reach
-- the answer keys, and cannot write gameplay state at all.

create extension if not exists pgtap with schema extensions;

begin;
select plan(29);

-- ---------------------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------------------

create or replace function pg_temp.act_as(p_uid uuid)
returns void language plpgsql as $$
begin
  execute 'set local role authenticated';
  execute format('set local request.jwt.claims = %L',
                 json_build_object('sub', p_uid, 'role', 'authenticated')::text);
end;
$$;

create or replace function pg_temp.act_as_anon()
returns void language plpgsql as $$
begin
  execute 'set local role anon';
  execute 'set local request.jwt.claims = ''''';
end;
$$;

create or replace function pg_temp.act_as_owner()
returns void language plpgsql as $$
begin
  execute 'reset role';
  execute 'set local request.jwt.claims = ''''';
end;
$$;

insert into auth.users (id, email, is_anonymous)
values
  ('11111111-1111-1111-1111-111111111111', 'free@test.local', false),
  ('22222222-2222-2222-2222-222222222222', 'premium@test.local', false),
  ('33333333-3333-3333-3333-333333333333', 'other@test.local', false),
  ('44444444-4444-4444-4444-444444444444', null, true);

insert into public.user_entitlements (user_id, entitlement, is_active)
values ('22222222-2222-2222-2222-222222222222', 'premium', true);

-- Minimal content: a free module and a premium one, each with a lesson and a question.
insert into public.courses (id, slug, title)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'python-fundamentals', '{"en":"Python"}');

insert into public.modules (id, course_id, slug, title, order_index)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'getting-started', '{"en":"Getting started"}', 1),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
   'oop-basics', '{"en":"OOP basics"}', 16);

insert into public.lessons (id, module_id, slug, title, order_index)
values ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
        'print', '{"en":"print"}', 1);

insert into public.lesson_contents (lesson_id, blocks)
values ('cccccccc-0000-0000-0000-000000000001', '[{"type":"text","body":{"en":"hi"}}]');

insert into public.questions (id, lesson_id, type, difficulty, prompt, explanation)
values ('dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
        'true_false', 'easy', '{"en":"Is this true?"}', '{"en":"Because."}');

insert into public.question_answer_keys (question_id, answer)
values ('dddddddd-0000-0000-0000-000000000001', '{"value":true}');

-- Private config key: must never reach a client.
insert into public.app_config (key, value, is_public)
values ('internal_test_secret', '"do-not-expose"'::jsonb, false);

-- ---------------------------------------------------------------------------------------
-- 1. Anonymous request (no session at all)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as_anon();

-- Denied by the GRANT layer, before RLS is even consulted — a stronger guarantee than
-- RLS filtering the rows away, so the assertion is a permission error, not an empty set.
select throws_ok(
  'select count(*) from public.courses',
  '42501',
  null,
  'anon is denied permission on the course catalogue'
);

select throws_ok(
  'select count(*) from public.profiles',
  '42501',
  null,
  'anon is denied permission on profiles'
);

-- Public config IS readable pre-auth, so the force-update screen works before sign-in.
select ok((select count(*) > 0 from public.app_config),
  'anon CAN read public app_config (needed before sign-in)');

select is((select count(*)::int from public.app_config where key = 'internal_test_secret'), 0,
  'anon cannot see private config keys');

select is((select public.get_app_config() ? 'internal_test_secret'), false,
  'get_app_config() never returns a private key');

-- ---------------------------------------------------------------------------------------
-- 2. Guest (anonymous sign-in, D1)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('44444444-4444-4444-4444-444444444444');

select ok((select count(*) > 0 from public.courses),
  'guest can read the course catalogue');

select is((select count(*)::int from public.profiles), 1,
  'guest sees exactly one profile — their own');

select is((select id from public.profiles), '44444444-4444-4444-4444-444444444444'::uuid,
  'and it is their own row');

-- ---------------------------------------------------------------------------------------
-- 3. Answer keys are unreachable by every client role
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('11111111-1111-1111-1111-111111111111');
select throws_ok(
  'select * from public.question_answer_keys',
  '42501',
  null,
  'free user is denied permission on question_answer_keys (SPEC §59.29)'
);

select pg_temp.act_as('22222222-2222-2222-2222-222222222222');
select throws_ok(
  'select * from public.question_answer_keys',
  '42501',
  null,
  'even a premium user is denied permission on question_answer_keys'
);

-- Lesson bodies and questions are RPC-only for everyone.
select throws_ok(
  'select * from public.questions',
  '42501',
  null,
  'questions are not directly readable — only through entitlement-checked RPCs'
);

select throws_ok(
  'select * from public.lesson_contents',
  '42501',
  null,
  'lesson_contents are not directly readable'
);

-- ---------------------------------------------------------------------------------------
-- 4. Free user: own rows only, and no writes
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as_owner();
insert into public.xp_events (user_id, source_type, source_id, amount)
values
  ('11111111-1111-1111-1111-111111111111', 'lesson', 'seed-free', 10),
  ('33333333-3333-3333-3333-333333333333', 'lesson', 'seed-other', 10);

select pg_temp.act_as('11111111-1111-1111-1111-111111111111');

select is((select count(*)::int from public.xp_events), 1,
  'free user sees only their own XP events, not another user''s');

select is((select count(*)::int from public.user_stats), 1,
  'free user sees only their own stats row');

select throws_ok(
  $$insert into public.xp_events (user_id, source_type, source_id, amount)
    values ('11111111-1111-1111-1111-111111111111', 'lesson', 'forged', 99999)$$,
  '42501',
  null,
  'free user cannot write XP directly — the ledger is server-only (SPEC §19)'
);

select throws_ok(
  $$update public.user_stats set xp_total = 999999
    where user_id = '11111111-1111-1111-1111-111111111111'$$,
  '42501',
  null,
  'free user cannot inflate their own stats'
);

select throws_ok(
  $$update public.profiles set leaderboard_hidden = false
    where id = '11111111-1111-1111-1111-111111111111'$$,
  '42501',
  null,
  'profiles are not directly writable — update_profile() is the only path (SPEC §40)'
);

select throws_ok(
  $$insert into public.user_entitlements (user_id, entitlement, is_active)
    values ('11111111-1111-1111-1111-111111111111', 'premium', true)$$,
  '42501',
  null,
  'a user cannot grant themselves an entitlement (SPEC §31)'
);

-- ---------------------------------------------------------------------------------------
-- 5. Another user's data stays invisible
-- ---------------------------------------------------------------------------------------

select is(
  (select count(*)::int from public.profiles
   where id = '33333333-3333-3333-3333-333333333333'),
  0,
  'free user cannot read another user''s profile'
);

select is(
  (select count(*)::int from public.xp_events
   where user_id = '33333333-3333-3333-3333-333333333333'),
  0,
  'free user cannot read another user''s XP events'
);

select is(
  (select count(*)::int from public.user_entitlements
   where user_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'free user cannot read another user''s entitlements'
);

-- ---------------------------------------------------------------------------------------
-- 6. Entitlements and the free content boundary (D5)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as_owner();

select ok(
  public.has_entitlement('22222222-2222-2222-2222-222222222222', 'premium'),
  'premium user holds the premium entitlement'
);

select ok(
  not public.has_entitlement('11111111-1111-1111-1111-111111111111', 'premium'),
  'free user does not'
);

select ok(
  public.can_access_module('11111111-1111-1111-1111-111111111111',
                           'bbbbbbbb-0000-0000-0000-000000000001'),
  'free user can open module 1, inside the free boundary'
);

select ok(
  not public.can_access_module('11111111-1111-1111-1111-111111111111',
                               'bbbbbbbb-0000-0000-0000-000000000002'),
  'free user cannot open module 16, beyond free_module_count'
);

select ok(
  public.can_access_module('22222222-2222-2222-2222-222222222222',
                           'bbbbbbbb-0000-0000-0000-000000000002'),
  'premium user can open module 16'
);

-- An expired entitlement must not grant access.
update public.user_entitlements
set expires_at = now() - interval '1 day'
where user_id = '22222222-2222-2222-2222-222222222222';

select ok(
  not public.has_entitlement('22222222-2222-2222-2222-222222222222', 'premium'),
  'an expired entitlement grants nothing'
);

-- ---------------------------------------------------------------------------------------
-- 7. reports: insert own only
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('11111111-1111-1111-1111-111111111111');

select lives_ok(
  $$insert into public.reports (reporter_id, reported_user_id, reason)
    values ('11111111-1111-1111-1111-111111111111',
            '33333333-3333-3333-3333-333333333333', 'spam')$$,
  'a user can file a report as themselves'
);

select throws_ok(
  $$insert into public.reports (reporter_id, reported_user_id, reason)
    values ('33333333-3333-3333-3333-333333333333',
            '11111111-1111-1111-1111-111111111111', 'framed')$$,
  '42501',
  null,
  'a user cannot file a report in someone else''s name'
);

select * from finish();
rollback;

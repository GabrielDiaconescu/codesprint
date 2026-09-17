-- Schema-level security invariants (SPEC §39, §40).
--
-- These assert properties of the SCHEMA itself rather than of any query, so a future
-- migration cannot quietly weaken the foundations — adding a table without RLS, or adding
-- a policy to the answer-key table, fails here.

create extension if not exists pgtap with schema extensions;

begin;
select plan(9);

-- ---------------------------------------------------------------------------------------
-- RLS is enabled on every table, with no exceptions
-- ---------------------------------------------------------------------------------------

select is(
  (select count(*)::int
   from pg_catalog.pg_class c
   join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0,
  'every table in public has RLS enabled (SPEC §39)'
);

-- ---------------------------------------------------------------------------------------
-- The answer keys are unreachable
-- ---------------------------------------------------------------------------------------

select is(
  (select count(*)::int from pg_catalog.pg_policies
   where schemaname = 'public' and tablename = 'question_answer_keys'),
  0,
  'question_answer_keys has ZERO policies — never add one (SPEC §17, §59.29)'
);

select ok(
  (select c.relforcerowsecurity
   from pg_catalog.pg_class c
   join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'question_answer_keys'),
  'question_answer_keys forces RLS, so even the table owner cannot read around it'
);

select is(
  (select count(*)::int
   from information_schema.role_table_grants
   where table_schema = 'public'
     and table_name = 'question_answer_keys'
     and grantee in ('anon', 'authenticated')),
  0,
  'no client role holds any privilege on question_answer_keys'
);

-- ---------------------------------------------------------------------------------------
-- Lesson bodies and questions are RPC-only
-- ---------------------------------------------------------------------------------------

select is(
  (select count(*)::int
   from information_schema.role_table_grants
   where table_schema = 'public'
     and table_name in ('lesson_contents', 'questions', 'daily_challenges', 'billing_events')
     and grantee in ('anon', 'authenticated')),
  0,
  'lesson_contents, questions, daily_challenges and billing_events are not client-readable'
);

-- ---------------------------------------------------------------------------------------
-- No client role may write gameplay state (SPEC §59.26)
-- ---------------------------------------------------------------------------------------
--
-- `reports` is the single intentional exception: the client inserts its own report.

select is(
  (select coalesce(string_agg(distinct table_name, ', ' order by table_name), '')
   from information_schema.role_table_grants
   where table_schema = 'public'
     and grantee in ('anon', 'authenticated')
     and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
     and table_name <> 'reports'),
  '',
  'no client write privilege on any table except reports'
);

-- ---------------------------------------------------------------------------------------
-- SECURITY DEFINER functions are hardened (SPEC §40)
-- ---------------------------------------------------------------------------------------

select is(
  (select coalesce(string_agg(p.proname, ', ' order by p.proname), '')
   from pg_catalog.pg_proc p
   join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prosecdef
     and not exists (
       select 1 from unnest(coalesce(p.proconfig, '{}')) as cfg
       where cfg like 'search_path=%'
     )),
  '',
  'every SECURITY DEFINER function pins search_path (SPEC §40)'
);

-- ---------------------------------------------------------------------------------------
-- The XP ledger invariant (SPEC §19)
-- ---------------------------------------------------------------------------------------

select ok(
  exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.xp_events'::regclass
      and contype = 'u'
      and conname = 'xp_events_unique_reward'
  ),
  'xp_events keeps its UNIQUE (user_id, source_type, source_id) reward constraint'
);

-- ---------------------------------------------------------------------------------------
-- Answers cannot hide in the client-visible payload
-- ---------------------------------------------------------------------------------------

select ok(
  exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.questions'::regclass
      and conname = 'questions_payload_has_no_answer'
  ),
  'questions.payload is constrained against carrying an answer field'
);

select * from finish();
rollback;

-- Privacy: export and deletion (SPEC §41, Phase 18).
--
-- The two rights, tested for what they must NOT do as much as for what they do: an export
-- that includes someone else's data, or answer keys, is a leak; a deletion that leaves a row
-- behind anywhere is a promise broken.

create extension if not exists pgtap with schema extensions;

begin;
select plan(16);

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

create or replace function pg_temp.tf_question(p_nth integer default 1)
returns uuid language sql security definer as $$
  select q.id
  from public.questions q
  join public.lessons l on l.id = q.lesson_id
  join public.modules m on m.id = l.module_id
  where q.type = 'true_false' and q.is_active and not q.is_premium and m.order_index = 1
  order by l.order_index, q.order_index
  offset p_nth - 1 limit 1;
$$;

create or replace function pg_temp.right_answer(p_question uuid)
returns jsonb language sql security definer as $$
  select k.answer from public.question_answer_keys k where k.question_id = p_question;
$$;

/**
 * Every row, in every public table, that still points at this user — found from the catalogue,
 * so a table added later is checked without anyone remembering to add it here.
 */
create or replace function pg_temp.rows_referencing(p_uid uuid)
returns bigint language plpgsql security definer as $$
declare
  r record;
  v_count bigint;
  v_total bigint := 0;
begin
  for r in
    select c.table_name, c.column_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public'
      and t.table_type = 'BASE TABLE'
      and c.column_name in ('user_id', 'reporter_id', 'reported_user_id')
      and c.data_type = 'uuid'
  loop
    execute format('select count(*) from public.%I where %I = $1', r.table_name, r.column_name)
      into v_count using p_uid;
    v_total := v_total + v_count;
  end loop;

  select v_total + count(*) into v_total from public.profiles p where p.id = p_uid;
  return v_total;
end;
$$;

-- X exports and is deleted; Y is somebody else, with data of their own.
insert into auth.users (id, email) values
  ('ffff1717-0000-0000-0000-00000000000a', 'export-me@test.local'),
  ('ffff1717-0000-0000-0000-00000000000b', 'someone-else@test.local');

update public.profiles set display_name = 'Exporter' where id = 'ffff1717-0000-0000-0000-00000000000a';

-- Activity for both, through the real functions.
select pg_temp.act_as('ffff1717-0000-0000-0000-00000000000a');
select public.submit_answer(pg_temp.tf_question(1), pg_temp.right_answer(pg_temp.tf_question(1)), 'lesson');
select public.submit_answer(pg_temp.tf_question(2), pg_temp.right_answer(pg_temp.tf_question(2)), 'lesson');

select pg_temp.act_as('ffff1717-0000-0000-0000-00000000000b');
select public.submit_answer(pg_temp.tf_question(1), pg_temp.right_answer(pg_temp.tf_question(1)), 'lesson');

-- A report each way, a purchase event and an entitlement — written as the owner, as the
-- server paths that write them would.
select pg_temp.act_as_owner();
insert into public.reports (reporter_id, reported_user_id, reason, note) values
  ('ffff1717-0000-0000-0000-00000000000a', 'ffff1717-0000-0000-0000-00000000000b', 'offensive_name', 'by X'),
  ('ffff1717-0000-0000-0000-00000000000b', 'ffff1717-0000-0000-0000-00000000000a', 'offensive_name', 'by Y');

insert into public.billing_events (event_id, user_id, event_type, payload)
values ('evt-privacy-1', 'ffff1717-0000-0000-0000-00000000000a', 'INITIAL_PURCHASE',
        '{"app_user_id": "ffff1717-0000-0000-0000-00000000000a", "price": 7.99}'::jsonb);

insert into public.user_entitlements (user_id, entitlement, is_active)
values ('ffff1717-0000-0000-0000-00000000000a', 'no_ads', true);

-- ---------------------------------------------------------------------------------------
-- Export (SPEC §41; GDPR arts. 15, 20)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('ffff1717-0000-0000-0000-00000000000a');
create temp table export_x as select public.export_my_data() as doc;

select is(
  (select doc ->> 'format' from export_x),
  'codesprint-data-export',
  'the export says what it is'
);

select is(
  (select doc -> 'account' ->> 'email' from export_x),
  'export-me@test.local',
  'it includes the account'
);

select is(
  (select doc -> 'profile' ->> 'display_name' from export_x),
  'Exporter',
  'and the profile'
);

select is(
  (select jsonb_array_length(doc -> 'answers') from export_x),
  2,
  'and every answer this learner gave — not the other learner''s'
);

select is(
  (select jsonb_array_length(doc -> 'purchase_events') from export_x),
  1,
  'and the purchase history'
);

select is(
  (select doc -> 'reports_filed' -> 0 ->> 'note' from export_x),
  'by X',
  'and the reports this learner filed'
);

select ok(
  (select (doc -> 'reports_about_you' -> 0) ? 'reason'
          and not (doc -> 'reports_about_you' -> 0) ? 'note'
          and (select doc::text from export_x) not like '%ffff1717-0000-0000-0000-00000000000b%'
   from export_x),
  'a report about them is there, but never who filed it — no other user''s id appears at all'
);

select ok(
  (select doc::text not like '%accepted_answers%' and doc::text not like '%match_mode%'
   from export_x),
  'no answer key is ever part of an export'
);

-- A second export straight away is fine; a burst is not.
select pg_temp.act_as_owner();
update public.app_config set value = '2'::jsonb where key = 'rate_limit_exports_per_hour';
select pg_temp.act_as('ffff1717-0000-0000-0000-00000000000a');

select lives_ok(
  $$select public.export_my_data()$$,
  'a second export inside the hour is allowed'
);

select throws_ok(
  $$select public.export_my_data()$$,
  'RL000',
  'rate limited: export',
  'a third is not'
);

select pg_temp.act_as_owner();
update public.app_config set value = '10'::jsonb where key = 'rate_limit_exports_per_hour';

-- Nobody can export anybody without being them.
set local role anon;
select throws_ok(
  $$select public.export_my_data()$$,
  '42501',
  null,
  'a signed-out caller cannot export anything'
);
select pg_temp.act_as_owner();

-- ---------------------------------------------------------------------------------------
-- Deletion (SPEC §41)
-- ---------------------------------------------------------------------------------------

select ok(
  pg_temp.rows_referencing('ffff1717-0000-0000-0000-00000000000a') > 5,
  'before deletion, the learner has data in several tables'
);

delete from auth.users where id = 'ffff1717-0000-0000-0000-00000000000a';

select is(
  pg_temp.rows_referencing('ffff1717-0000-0000-0000-00000000000a'),
  0::bigint,
  'after it, no row in any table points at them'
);

select is(
  (select payload from public.billing_events where event_id = 'evt-privacy-1'),
  '{"redacted": true, "reason": "account deleted"}'::jsonb,
  'the purchase event keeps its id for idempotency, but not their purchase history'
);

select ok(
  (select count(*) from public.billing_events
   where payload::text like '%ffff1717-0000-0000-0000-00000000000a%') = 0,
  'their id is nowhere in the purchase log'
);

select ok(
  exists (select 1 from public.profiles where id = 'ffff1717-0000-0000-0000-00000000000b')
  and exists (select 1 from public.user_stats
              where user_id = 'ffff1717-0000-0000-0000-00000000000b')
  and (select count(*) from public.user_question_attempts
       where user_id = 'ffff1717-0000-0000-0000-00000000000b') = 1,
  'somebody else''s account and activity are untouched'
);

select * from finish();
rollback;

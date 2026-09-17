-- The lesson engine (SPEC §14, §15, §17, §40, Phase 7).
--
-- `get_lesson` is the only path from a client to lesson bodies and questions, so it carries
-- two burdens: it must refuse a module the user has not paid for, and it must not hand over
-- the explanations. The second is easy to break by accident — adding one field to a
-- jsonb_build_object would do it — so it is asserted against the real seeded content.

create extension if not exists pgtap with schema extensions;

begin;
select plan(22);

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

-- The seeded content: two real modules from the development seed.
create or replace function pg_temp.lesson_in(p_module_order integer, p_lesson_order integer)
returns uuid language sql as $$
  select l.id
  from public.lessons l
  join public.modules m on m.id = l.module_id
  where m.order_index = p_module_order and l.order_index = p_lesson_order;
$$;

insert into auth.users (id, email) values
  ('eeee0000-0000-0000-0000-000000000001', 'freelearner@test.local'),
  ('eeee0000-0000-0000-0000-000000000002', 'premiumlearner@test.local');

insert into auth.users (id, is_anonymous) values
  ('eeee0000-0000-0000-0000-000000000003', true);

insert into public.user_entitlements (user_id, entitlement, is_active)
values ('eeee0000-0000-0000-0000-000000000002', 'premium', true);

-- ---------------------------------------------------------------------------------------
-- Localisation helpers
-- ---------------------------------------------------------------------------------------

select is(
  public.localized_text('{"en":"Hello","ro":"Salut"}'::jsonb, 'ro'),
  'Salut',
  'localized_text picks the requested locale'
);

select is(
  public.localized_text('{"en":"Hello"}'::jsonb, 'ro'),
  'Hello',
  'and falls back to English when the locale is missing'
);

select is(
  public.localized_text('{"en":"Hello","ro":""}'::jsonb, 'ro'),
  'Hello',
  'an empty translation falls back rather than blanking the screen'
);

select is(
  public.localize_deep('{"options":[{"id":"a","text":{"en":"Yes","ro":"Da"}}]}'::jsonb, 'ro'),
  '{"options":[{"id":"a","text":"Da"}]}'::jsonb,
  'localize_deep collapses localized objects wherever they are nested'
);

select is(
  public.localize_deep('{"input":"tokens","tokens":["print","show"]}'::jsonb, 'ro'),
  '{"input":"tokens","tokens":["print","show"]}'::jsonb,
  'and leaves plain values alone'
);

select is(
  public.localize_deep('[{"a":{"en":"1"}},{"a":{"en":"2"}}]'::jsonb, 'en'),
  '[{"a":"1"},{"a":"2"}]'::jsonb,
  'array order survives localisation'
);

-- ---------------------------------------------------------------------------------------
-- A free user opening a free lesson
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('eeee0000-0000-0000-0000-000000000001');

select is(
  (public.get_lesson(pg_temp.lesson_in(1, 1)) ->> 'slug'),
  'what-is-python',
  'a free user can open the first lesson'
);

select ok(
  jsonb_array_length(public.get_lesson(pg_temp.lesson_in(1, 1)) -> 'blocks') > 5,
  'and the lesson comes back with its blocks'
);

select is(
  (public.get_lesson(pg_temp.lesson_in(1, 1)) -> 'module' ->> 'slug'),
  'getting-started',
  'the module is included, so the player can show where it sits'
);

-- ---------------------------------------------------------------------------------------
-- What must never come back
-- ---------------------------------------------------------------------------------------
--
-- Asserted against the whole serialised payload rather than field by field: a leak added in
-- one branch of the block resolver would slip past a field-level check.

select ok(
  public.get_lesson(pg_temp.lesson_in(1, 1))::text !~ '"explanation"',
  'no explanation is returned — it is the reward for answering (SPEC §18)'
);

select ok(
  public.get_lesson(pg_temp.lesson_in(1, 1))::text !~ '"hint"',
  'no hint text is returned'
);

select ok(
  public.get_lesson(pg_temp.lesson_in(1, 1))::text !~ '"answer"',
  'no answer key is returned'
);

-- Proves the point with real seeded content rather than only on key names.
select ok(
  public.get_lesson(pg_temp.lesson_in(1, 1))::text !~ 'The interpreter is what actually runs',
  'and no explanation text leaks through under another key'
);

select ok(
  (public.get_lesson(pg_temp.lesson_in(1, 1)) -> 'blocks' -> 5 -> 'question' ? 'has_hint'),
  'the client is told WHETHER a hint exists, so it can offer the button'
);

-- ---------------------------------------------------------------------------------------
-- The paywall boundary
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as_owner();

-- Narrow the free boundary so the seeded second module becomes premium.
update public.app_config set value = '1'::jsonb where key = 'free_module_count';

select pg_temp.act_as('eeee0000-0000-0000-0000-000000000001');

select throws_ok(
  format($$select public.get_lesson(%L)$$, pg_temp.lesson_in(2, 1)),
  '42501',
  null,
  'a free user is refused a premium module'
);

select lives_ok(
  format($$select public.get_lesson(%L)$$, pg_temp.lesson_in(1, 1)),
  'while the free module still opens'
);

select pg_temp.act_as('eeee0000-0000-0000-0000-000000000002');

select is(
  (public.get_lesson(pg_temp.lesson_in(2, 1)) -> 'module' ->> 'slug'),
  'variables',
  'a premium user opens the premium module'
);

-- Guests are learners too: SPEC §12 D1 has them start the first lesson immediately.
select pg_temp.act_as('eeee0000-0000-0000-0000-000000000003');

select lives_ok(
  format($$select public.get_lesson(%L)$$, pg_temp.lesson_in(1, 1)),
  'a guest can open a free lesson without an account'
);

select throws_ok(
  format($$select public.get_lesson(%L)$$, pg_temp.lesson_in(2, 1)),
  '42501',
  null,
  'but a guest is still refused premium content'
);

select pg_temp.act_as_owner();
update public.app_config set value = '6'::jsonb where key = 'free_module_count';

-- ---------------------------------------------------------------------------------------
-- Missing and withdrawn content
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('eeee0000-0000-0000-0000-000000000001');

select throws_ok(
  $$select public.get_lesson('00000000-0000-0000-0000-0000000000ff')$$,
  'P0002',
  null,
  'a lesson that does not exist is reported as missing, not as a permission problem'
);

select pg_temp.act_as_owner();
update public.lessons set is_active = false where id = pg_temp.lesson_in(1, 2);
select pg_temp.act_as('eeee0000-0000-0000-0000-000000000001');

select throws_ok(
  format($$select public.get_lesson(%L)$$, (select id from public.lessons where slug = 'printing')),
  'P0002',
  null,
  'a withdrawn lesson is unreachable, even though its row still exists'
);

-- ---------------------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as_owner();

select ok(
  not has_function_privilege('anon', 'public.get_lesson(uuid, text)', 'execute'),
  'an unauthenticated caller cannot fetch a lesson at all'
);

select * from finish();
rollback;

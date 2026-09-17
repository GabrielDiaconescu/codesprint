-- The age gate and the SPEC §41 minor protections (Phase 5).
--
-- These are the tests that matter most in the whole suite so far, because they defend people
-- rather than data. A privacy default a client can switch off is not a default, so every
-- assertion below sends the hostile value — `analytics_consent: true` from a 14-year-old's
-- app — and proves the server refuses it.

create extension if not exists pgtap with schema extensions;

begin;
select plan(26);

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

-- Ages are expressed relative to the current year so the suite does not rot.
create or replace function pg_temp.birth_year_for_age(p_age integer)
returns integer language sql as $$
  select extract(year from now())::integer - p_age;
$$;

insert into auth.users (id, email) values
  ('dddd0000-0000-0000-0000-000000000001', 'adult@test.local'),
  ('dddd0000-0000-0000-0000-000000000002', 'fifteen@test.local'),
  ('dddd0000-0000-0000-0000-000000000003', 'unknownage@test.local'),
  ('dddd0000-0000-0000-0000-000000000004', 'twelve@test.local');

-- ---------------------------------------------------------------------------------------
-- Age arithmetic
-- ---------------------------------------------------------------------------------------

select is(
  public.age_from_birth_year(pg_temp.birth_year_for_age(30)),
  30,
  'age_from_birth_year returns the age reached this year'
);

select is(
  public.age_from_birth_year(null),
  null,
  'an unknown birth year has no age'
);

-- ---------------------------------------------------------------------------------------
-- is_minor fails closed
-- ---------------------------------------------------------------------------------------

select is(
  public.is_minor('dddd0000-0000-0000-0000-000000000003'),
  true,
  'a user who has not answered the age gate counts as a minor'
);

select is(
  public.is_minor('00000000-0000-0000-0000-000000000000'),
  true,
  'so does a user who does not exist at all'
);

-- ---------------------------------------------------------------------------------------
-- An adult may set every privacy option
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('dddd0000-0000-0000-0000-000000000001');

select lives_ok(
  format(
    $$select public.update_profile(
        jsonb_build_object(
          'birth_year', %s,
          'experience_level', 'beginner',
          'motivation', 'career',
          'daily_goal_minutes', 10,
          'reminder_time', '19:30',
          'analytics_consent', true,
          'leaderboard_hidden', false,
          'ads_consent_status', 'obtained',
          'onboarding_completed', true))$$,
    pg_temp.birth_year_for_age(30)
  ),
  'an adult can complete onboarding'
);

select pg_temp.act_as_owner();

select is(
  (select analytics_consent from public.profiles
    where id = 'dddd0000-0000-0000-0000-000000000001'),
  true,
  'an adult who opts into analytics is recorded as opted in'
);

select is(
  (select leaderboard_hidden from public.profiles
    where id = 'dddd0000-0000-0000-0000-000000000001'),
  false,
  'an adult appears on the leaderboard when they choose to'
);

select is(
  (select ads_consent_status from public.profiles
    where id = 'dddd0000-0000-0000-0000-000000000001'),
  'obtained',
  'an adult can grant ads consent'
);

select is(
  (select experience_level || '/' || motivation || '/' || daily_goal_minutes::text
     from public.profiles where id = 'dddd0000-0000-0000-0000-000000000001'),
  'beginner/career/10',
  'the onboarding answers are stored'
);

select is(
  (select reminder_time::text from public.profiles
    where id = 'dddd0000-0000-0000-0000-000000000001'),
  '19:30:00',
  'and so is the reminder time'
);

select isnt(
  (select onboarding_completed_at from public.profiles
    where id = 'dddd0000-0000-0000-0000-000000000001'),
  null,
  'onboarding is marked complete'
);

select is(
  public.is_minor('dddd0000-0000-0000-0000-000000000001'),
  false,
  'and the adult is not treated as a minor'
);

-- ---------------------------------------------------------------------------------------
-- The completion timestamp is not moved by later edits
-- ---------------------------------------------------------------------------------------
--
-- It is the record of WHEN the user onboarded. Re-stamping it on every settings change would
-- quietly destroy that.

-- Back-dated deliberately: inside a test transaction now() is frozen, so comparing the
-- timestamp against now() would pass whether or not it had been rewritten.
update public.profiles set onboarding_completed_at = timestamptz '2026-01-01 08:00:00+00'
  where id = 'dddd0000-0000-0000-0000-000000000001';

select pg_temp.act_as('dddd0000-0000-0000-0000-000000000001');
select public.update_profile('{"onboarding_completed": true}'::jsonb);
select pg_temp.act_as_owner();

select is(
  (select onboarding_completed_at from public.profiles
    where id = 'dddd0000-0000-0000-0000-000000000001'),
  timestamptz '2026-01-01 08:00:00+00',
  'completing onboarding twice does not move the original timestamp'
);

-- ---------------------------------------------------------------------------------------
-- A 15-year-old: the client asks for everything, the server grants none of it
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('dddd0000-0000-0000-0000-000000000002');

select lives_ok(
  format(
    $$select public.update_profile(
        jsonb_build_object(
          'birth_year', %s,
          'experience_level', 'complete_beginner',
          'analytics_consent', true,
          'leaderboard_hidden', false,
          'ads_consent_status', 'obtained',
          'onboarding_completed', true))$$,
    pg_temp.birth_year_for_age(15)
  ),
  'a 15-year-old can complete onboarding'
);

select pg_temp.act_as_owner();

select is(
  (select analytics_consent from public.profiles
    where id = 'dddd0000-0000-0000-0000-000000000002'),
  false,
  'analytics stays off for a minor even though the client asked for it'
);

select is(
  (select leaderboard_hidden from public.profiles
    where id = 'dddd0000-0000-0000-0000-000000000002'),
  true,
  'a minor stays hidden from the leaderboard even though the client asked to show them'
);

select is(
  (select ads_consent_status from public.profiles
    where id = 'dddd0000-0000-0000-0000-000000000002'),
  'restricted',
  'a minor gets non-personalised ads only, whatever the client claims'
);

select is(
  (select experience_level from public.profiles
    where id = 'dddd0000-0000-0000-0000-000000000002'),
  'complete_beginner',
  'the non-privacy answers are still saved — the minor is protected, not blocked'
);

-- A second attempt, once the profile already exists, must be refused too.
select pg_temp.act_as('dddd0000-0000-0000-0000-000000000002');
select public.update_profile('{"analytics_consent": true, "leaderboard_hidden": false}'::jsonb);
select pg_temp.act_as_owner();

select is(
  (select analytics_consent::text || '/' || leaderboard_hidden::text
     from public.profiles where id = 'dddd0000-0000-0000-0000-000000000002'),
  'false/true',
  'and a later attempt to flip them is refused as well'
);

-- ---------------------------------------------------------------------------------------
-- Under the minimum age
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('dddd0000-0000-0000-0000-000000000004');

select throws_ok(
  format(
    $$select public.update_profile(jsonb_build_object('birth_year', %s))$$,
    pg_temp.birth_year_for_age(12)
  ),
  '22023',
  null,
  'a profile cannot be written for someone under the minimum age'
);

-- The account itself must go, not merely be blocked: leaving it would mean storing a child's
-- email address indefinitely (SPEC §41).
select lives_ok(
  $$select public.reject_underage_account()$$,
  'the age gate can delete the calling account'
);

select pg_temp.act_as_owner();

select ok(
  not exists (select 1 from auth.users where id = 'dddd0000-0000-0000-0000-000000000004'),
  'the under-age account is gone'
);

select ok(
  not exists (select 1 from public.profiles where id = 'dddd0000-0000-0000-0000-000000000004'),
  'and the delete cascades to their profile'
);

select ok(
  (select count(*)::int from auth.users where id::text like 'dddd0000%') = 3,
  'and nobody else was deleted'
);

-- ---------------------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------------------

select ok(
  not has_function_privilege('anon', 'public.reject_underage_account()', 'execute'),
  'an unauthenticated caller cannot delete accounts'
);

select ok(
  not has_function_privilege('authenticated', 'public.is_minor(uuid)', 'execute'),
  'is_minor is internal: the client cannot probe other users'
);

select * from finish();
rollback;

-- Guest-mode plumbing (SPEC §12, Phase 4).
--
-- Two guarantees are load-bearing and neither is visible from the app:
--
--   * a guest who signs up must stop being a guest everywhere, not just in auth.users, or
--     they are silently excluded from the leaderboard forever (SPEC §26);
--   * the purge must delete abandoned guests and nothing else — it is the one destructive
--     scheduled job in the product, and a mistake here loses real users' accounts.

create extension if not exists pgtap with schema extensions;

begin;
select plan(16);

-- ---------------------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------------------

-- An abandoned guest: anonymous, never linked, last seen long ago.
insert into auth.users (id, is_anonymous) values
  ('aaaa0000-0000-0000-0000-000000000001', true);

-- An active guest: anonymous, seen today.
insert into auth.users (id, is_anonymous) values
  ('aaaa0000-0000-0000-0000-000000000002', true);

-- A converted guest: started anonymous, later linked an email.
insert into auth.users (id, is_anonymous) values
  ('aaaa0000-0000-0000-0000-000000000003', true);

-- A registered user who has been inactive for a year. Must never be touched.
insert into auth.users (id, email) values
  ('aaaa0000-0000-0000-0000-000000000004', 'dormant@test.local');

update public.profiles set last_seen_at = now() - interval '90 days'
  where id in (
    'aaaa0000-0000-0000-0000-000000000001',
    'aaaa0000-0000-0000-0000-000000000004'
  );

-- ---------------------------------------------------------------------------------------
-- Bootstrapping covers guests too
-- ---------------------------------------------------------------------------------------

select is(
  (select count(*)::int from public.profiles
    where id::text like 'aaaa0000%'),
  4,
  'every auth user gets a profile, anonymous ones included'
);

select is(
  (select is_anonymous from public.profiles where id = 'aaaa0000-0000-0000-0000-000000000001'),
  true,
  'the profile mirrors is_anonymous at creation'
);

select is(
  (select is_anonymous from public.profiles where id = 'aaaa0000-0000-0000-0000-000000000004'),
  false,
  'a registered user is not marked anonymous'
);

-- ---------------------------------------------------------------------------------------
-- Guest -> account conversion
-- ---------------------------------------------------------------------------------------
--
-- This is what Supabase does internally when an anonymous user confirms an email address.

update auth.users
set is_anonymous = false, email = 'converted@test.local'
where id = 'aaaa0000-0000-0000-0000-000000000003';

select is(
  (select is_anonymous from public.profiles where id = 'aaaa0000-0000-0000-0000-000000000003'),
  false,
  'converting a guest clears is_anonymous on the profile'
);

select is(
  (select count(*)::int from public.user_stats
    where user_id = 'aaaa0000-0000-0000-0000-000000000003'),
  1,
  'and the converted user keeps the stats row created when they were a guest'
);

-- The whole point of linking rather than re-registering: the user id is stable, so every
-- xp_events / progress row written as a guest still belongs to them (SPEC §12).
select ok(
  exists (select 1 from auth.users where id = 'aaaa0000-0000-0000-0000-000000000003'),
  'and keeps the same user id, so guest progress survives'
);

-- ---------------------------------------------------------------------------------------
-- The purge
-- ---------------------------------------------------------------------------------------

select is(
  public.delete_stale_anonymous_users(30),
  1,
  'the purge deletes exactly the one abandoned guest'
);

select ok(
  not exists (select 1 from auth.users where id = 'aaaa0000-0000-0000-0000-000000000001'),
  'the abandoned guest is gone'
);

select ok(
  exists (select 1 from auth.users where id = 'aaaa0000-0000-0000-0000-000000000002'),
  'the active guest is untouched'
);

select ok(
  exists (select 1 from auth.users where id = 'aaaa0000-0000-0000-0000-000000000003'),
  'the converted guest is untouched even though they started anonymous'
);

select ok(
  exists (select 1 from auth.users where id = 'aaaa0000-0000-0000-0000-000000000004'),
  'a dormant REGISTERED user is never deleted, however long they have been away'
);

select ok(
  not exists (select 1 from public.profiles where id = 'aaaa0000-0000-0000-0000-000000000001'),
  'deleting the auth user cascades to the profile'
);

select is(
  public.delete_stale_anonymous_users(30),
  0,
  'running the purge again is a no-op'
);

-- A zero or negative window would delete every guest alive, including one created a second
-- ago. It is rejected rather than clamped, so a bad cron entry fails loudly.
select throws_ok(
  $$select public.delete_stale_anonymous_users(0)$$,
  '22023',
  null,
  'a retention window below one day is refused'
);

-- ---------------------------------------------------------------------------------------
-- Nobody can call the purge from the app
-- ---------------------------------------------------------------------------------------

select ok(
  not has_function_privilege('anon', 'public.delete_stale_anonymous_users(integer)', 'execute'),
  'anon cannot execute the purge'
);

select ok(
  not has_function_privilege(
    'authenticated', 'public.delete_stale_anonymous_users(integer)', 'execute'
  ),
  'authenticated cannot execute the purge'
);

select * from finish();
rollback;

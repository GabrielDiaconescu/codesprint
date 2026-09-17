-- The XP ledger invariants (SPEC §19, decision §0.1.2).
--
-- The product's whole anti-cheat position rests on this: XP is written in exactly one place,
-- a duplicate award is impossible by construction, and the denormalised totals cannot drift
-- from the ledger because they are written in the same transaction.

create extension if not exists pgtap with schema extensions;

begin;
select plan(13);

insert into auth.users (id, email) values
  ('55555555-5555-5555-5555-555555555555', 'ledger@test.local');

-- ---------------------------------------------------------------------------------------
-- A user is bootstrapped by the auth trigger, not by client code
-- ---------------------------------------------------------------------------------------

select is(
  (select count(*)::int from public.profiles where id = '55555555-5555-5555-5555-555555555555'),
  1,
  'creating an auth user creates a profile automatically'
);

select is(
  (select lives from public.user_stats where user_id = '55555555-5555-5555-5555-555555555555'),
  5,
  'and a stats row seeded with lives_max from config'
);

-- ---------------------------------------------------------------------------------------
-- First award
-- ---------------------------------------------------------------------------------------

select is(
  public.award_xp('55555555-5555-5555-5555-555555555555', 'question', 'q-1', 10),
  10,
  'the first award returns the amount granted'
);

select is(
  (select xp_total from public.user_stats where user_id = '55555555-5555-5555-5555-555555555555'),
  10,
  'user_stats.xp_total is updated in the same transaction'
);

select is(
  (select xp from public.leaderboard_weekly
   where user_id = '55555555-5555-5555-5555-555555555555'
     and week_start = public.iso_week_start()),
  10,
  'and so is the weekly leaderboard row'
);

-- ---------------------------------------------------------------------------------------
-- Replay: the core idempotency guarantee
-- ---------------------------------------------------------------------------------------
--
-- A dropped response, a double tap, or a retry after a timeout all arrive as the same
-- (user, source_type, source_id). None of them may award twice.

select is(
  public.award_xp('55555555-5555-5555-5555-555555555555', 'question', 'q-1', 10),
  0,
  'replaying the same award grants nothing'
);

select is(
  (select xp_total from public.user_stats where user_id = '55555555-5555-5555-5555-555555555555'),
  10,
  'the total is unchanged after a replay'
);

select is(
  (select count(*)::int from public.xp_events
   where user_id = '55555555-5555-5555-5555-555555555555'),
  1,
  'and only one ledger row exists'
);

-- A different amount for the same source id must still be refused: the reward key, not the
-- amount, is what identifies an award.
select is(
  public.award_xp('55555555-5555-5555-5555-555555555555', 'question', 'q-1', 99999),
  0,
  'a replay with an inflated amount is refused too'
);

-- ---------------------------------------------------------------------------------------
-- Distinct sources accumulate
-- ---------------------------------------------------------------------------------------

select is(
  public.award_xp('55555555-5555-5555-5555-555555555555', 'question', 'q-2', 5),
  5,
  'a different source id is a genuinely new award'
);

select is(
  (select xp_total from public.user_stats where user_id = '55555555-5555-5555-5555-555555555555'),
  15,
  'totals accumulate across distinct awards'
);

-- ---------------------------------------------------------------------------------------
-- Rewarded-ad XP must not inflate the leaderboard (SPEC §19)
-- ---------------------------------------------------------------------------------------

select is(
  public.award_xp('55555555-5555-5555-5555-555555555555', 'rewarded_ad', 'ad-1', 20, false),
  20,
  'rewarded-ad XP is granted to the user'
);

select is(
  (select xp from public.leaderboard_weekly
   where user_id = '55555555-5555-5555-5555-555555555555'
     and week_start = public.iso_week_start()),
  15,
  'but it does NOT count toward the weekly leaderboard'
);

select * from finish();
rollback;

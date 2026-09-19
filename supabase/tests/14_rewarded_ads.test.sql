-- Rewarded ads (SPEC §19, §22, §30, §42, Phase 15).
--
-- The client cannot grant itself anything: it watches an ad and asks the server, which caps
-- what it will hand out on the learner's local day. In V1 the server cannot verify the ad was
-- really watched (AdMob's server-side verification is V1.1, SPEC §42), so these caps are what
-- bounds the damage — which is also why a rewarded ad must never grant Premium content.
--
-- Two assertions carry most of the weight: the cap actually stops at the cap, and rewarded XP
-- never reaches the leaderboard. Minutes of advertising must not outrank minutes of learning.

create extension if not exists pgtap with schema extensions;

begin;
select plan(37);

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

/** The grant log is internal; a fixture needs to see what was written. */
create or replace function pg_temp.grants(p_uid uuid, p_type text)
returns integer language sql security definer as $$
  select count(*)::integer from public.rewarded_ad_grants g
  where g.user_id = p_uid and g.reward_type = p_type;
$$;

create or replace function pg_temp.lives_of(p_uid uuid)
returns integer language sql security definer as $$
  select s.lives from public.user_stats s where s.user_id = p_uid;
$$;

insert into auth.users (id, email) values
  ('dddd1515-0000-0000-0000-0000000000a1', 'ads-free@test.local'),
  ('dddd1515-0000-0000-0000-0000000000a2', 'ads-prem@test.local');

insert into public.user_entitlements (user_id, entitlement, is_active)
values ('dddd1515-0000-0000-0000-0000000000a2', 'premium', true);

-- ---------------------------------------------------------------------------------------
-- The allowance, read BEFORE offering an ad (SPEC §30)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('dddd1515-0000-0000-0000-0000000000a1');

select ok(
  not (public.rewarded_allowance() -> 'life' ->> 'available')::boolean,
  'a life is not on offer while lives are already full'
);

select ok(
  (public.rewarded_allowance() -> 'bonus_xp' ->> 'available')::boolean,
  'but bonus XP is'
);

select is(
  (public.rewarded_allowance() -> 'life' ->> 'cap')::integer,
  3,
  'the daily life cap comes from config, not from code'
);

select pg_temp.act_as_owner();
update public.user_stats set lives = 1 where user_id = 'dddd1515-0000-0000-0000-0000000000a1';
select pg_temp.act_as('dddd1515-0000-0000-0000-0000000000a1');

select ok(
  (public.rewarded_allowance() -> 'life' ->> 'available')::boolean,
  'once a life has been spent, one can be won back'
);

-- ---------------------------------------------------------------------------------------
-- Restoring a life (SPEC §22, §30)
-- ---------------------------------------------------------------------------------------

select is(
  (public.claim_rewarded_ad('life') -> 'lives' ->> 'lives')::integer,
  2,
  'watching an ad restores exactly one life'
);

select is(
  (public.claim_rewarded_ad('life') -> 'lives' ->> 'lives')::integer,
  3,
  'and again'
);

select is(
  (public.claim_rewarded_ad('life') -> 'lives' ->> 'lives')::integer,
  4,
  'and a third time'
);

select throws_ok(
  $$select public.claim_rewarded_ad('life')$$,
  '22023',
  null,
  'the fourth is refused — three a day is the configured limit (SPEC §30)'
);

select pg_temp.act_as_owner();

select is(
  pg_temp.grants('dddd1515-0000-0000-0000-0000000000a1', 'life'),
  3,
  'and the refusal wrote no grant, so the cap cannot be walked past by retrying'
);

select is(
  pg_temp.lives_of('dddd1515-0000-0000-0000-0000000000a1'),
  4,
  'nor did it hand out a fourth life'
);

-- ---------------------------------------------------------------------------------------
-- Refusals the UI should have prevented (SPEC §30, §46)
-- ---------------------------------------------------------------------------------------

update public.user_stats set lives = public.config_int('lives_max', 5)
where user_id = 'dddd1515-0000-0000-0000-0000000000a1';

delete from public.rewarded_ad_grants where user_id = 'dddd1515-0000-0000-0000-0000000000a1';

select pg_temp.act_as('dddd1515-0000-0000-0000-0000000000a1');

select throws_ok(
  $$select public.claim_rewarded_ad('life')$$,
  '22023',
  null,
  'a full set of lives refuses rather than burning one of the three daily grants on nothing'
);

select pg_temp.act_as('dddd1515-0000-0000-0000-0000000000a2');

select throws_ok(
  $$select public.claim_rewarded_ad('life')$$,
  '22023',
  null,
  'and a Premium learner is refused — their lives are unlimited, so there is nothing to give'
);

select pg_temp.act_as('dddd1515-0000-0000-0000-0000000000a1');

select throws_ok(
  $$select public.claim_rewarded_ad('a_free_module')$$,
  '22023',
  null,
  'an unknown reward type is refused — a rewarded ad never unlocks content (SPEC §30)'
);

select pg_temp.act_as_owner();
update public.app_config set value = 'false'::jsonb where key = 'ads_enabled';
select pg_temp.act_as('dddd1515-0000-0000-0000-0000000000a1');

select throws_ok(
  $$select public.claim_rewarded_ad('bonus_xp')$$,
  '22023',
  null,
  'the kill switch closes rewards too, not just the ads themselves (SPEC §50)'
);

select ok(
  not (public.rewarded_allowance() ->> 'ads_enabled')::boolean,
  'and the allowance says so, so the button is never drawn'
);

select pg_temp.act_as_owner();
update public.app_config set value = 'true'::jsonb where key = 'ads_enabled';

-- ---------------------------------------------------------------------------------------
-- Bonus XP (SPEC §19, §26, §42)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as('dddd1515-0000-0000-0000-0000000000a1');

select is(
  (public.claim_rewarded_ad('bonus_xp') ->> 'granted')::integer,
  10,
  'a rewarded ad pays the configured bonus'
);

select pg_temp.act_as_owner();

select is(
  (select xp_total from public.user_stats where user_id = 'dddd1515-0000-0000-0000-0000000000a1'),
  10,
  'which the learner keeps'
);

/**
 * The most important assertion in this file. Watching adverts must never move somebody up the
 * weekly ranking past somebody who answered questions (SPEC §19, §26).
 */
select is(
  (select count(*)::integer from public.leaderboard_weekly
   where user_id = 'dddd1515-0000-0000-0000-0000000000a1'),
  0,
  'and which NEVER reaches the leaderboard'
);

select is(
  (select bool_and(not counts_for_leaderboard)::text from public.xp_events
   where user_id = 'dddd1515-0000-0000-0000-0000000000a1' and source_type = 'rewarded_ad'),
  'true',
  'the ledger row says so itself, so a later recount cannot get it wrong'
);

select pg_temp.act_as('dddd1515-0000-0000-0000-0000000000a1');

select is(
  (public.claim_rewarded_ad('bonus_xp') ->> 'granted')::integer,
  10,
  'a second ad pays again'
);

select is(
  (public.claim_rewarded_ad('bonus_xp') ->> 'granted')::integer,
  10,
  'and a third reaches the daily cap exactly'
);

select throws_ok(
  $$select public.claim_rewarded_ad('bonus_xp')$$,
  '22023',
  null,
  'the fourth is refused rather than paying a partial amount'
);

select ok(
  not (public.rewarded_allowance() -> 'bonus_xp' ->> 'available')::boolean,
  'and the allowance closes the offer before it is made'
);

select pg_temp.act_as_owner();

select is(
  (select sum(amount)::integer from public.xp_events
   where user_id = 'dddd1515-0000-0000-0000-0000000000a1' and source_type = 'rewarded_ad'),
  30,
  'exactly the cap was paid, never a point more'
);

select is(
  pg_temp.grants('dddd1515-0000-0000-0000-0000000000a1', 'bonus_xp'),
  3,
  'with one grant row per ad'
);

select is(
  (select count(distinct source_id)::integer from public.xp_events
   where user_id = 'dddd1515-0000-0000-0000-0000000000a1' and source_type = 'rewarded_ad'),
  3,
  'and a distinct ledger key each time, so none of them collapsed into a replay'
);

-- ---------------------------------------------------------------------------------------
-- The day is the LEARNER's day (SPEC §21, §30)
-- ---------------------------------------------------------------------------------------

update public.profiles set timezone = 'Pacific/Kiritimati'
where id = 'dddd1515-0000-0000-0000-0000000000a1';

-- Yesterday for them, wherever the server happens to be.
update public.rewarded_ad_grants
set local_date = public.local_date_for('Pacific/Kiritimati') - 1
where user_id = 'dddd1515-0000-0000-0000-0000000000a1';

update public.xp_events set created_at = created_at - interval '2 days'
where user_id = 'dddd1515-0000-0000-0000-0000000000a1' and source_type = 'rewarded_ad';

select pg_temp.act_as('dddd1515-0000-0000-0000-0000000000a1');

select is(
  (public.rewarded_allowance() -> 'bonus_xp' ->> 'earned')::integer,
  0,
  'yesterday''s ads do not count against today''s allowance'
);

select ok(
  (public.rewarded_allowance() -> 'bonus_xp' ->> 'available')::boolean,
  'so the offer is open again at the learner''s midnight, not at UTC''s'
);

select lives_ok(
  $$select public.claim_rewarded_ad('bonus_xp')$$,
  'and a fresh day really can be claimed'
);

-- ---------------------------------------------------------------------------------------
-- A client cannot grant itself anything (SPEC §30, §40)
-- ---------------------------------------------------------------------------------------

select throws_ok(
  $$insert into public.rewarded_ad_grants (user_id, reward_type, local_date)
    values ('dddd1515-0000-0000-0000-0000000000a1', 'life', current_date)$$,
  '42501',
  null,
  'a client cannot write its own grant'
);

select throws_ok(
  $$update public.user_stats set lives = 5$$,
  '42501',
  null,
  'nor simply award itself the lives directly'
);

select throws_ok(
  $$insert into public.xp_events (user_id, source_type, source_id, amount, week_start)
    values ('dddd1515-0000-0000-0000-0000000000a1', 'rewarded_ad', 'forged', 9999,
            public.iso_week_start())$$,
  '42501',
  null,
  'nor write the XP it wanted'
);

-- Reading your OWN grants is allowed, like the XP ledger: it is a record of what you did,
-- and seeing it leaks nothing. Writing one is what must be impossible.
select is(
  (select count(*)::integer from public.rewarded_ad_grants),
  (select count(*)::integer from public.rewarded_ad_grants
   where user_id = 'dddd1515-0000-0000-0000-0000000000a1'),
  'a learner sees their own grants and nobody else''s'
);

-- ---------------------------------------------------------------------------------------
-- Grants (SPEC §40)
-- ---------------------------------------------------------------------------------------

select pg_temp.act_as_owner();

select ok(
  has_function_privilege('authenticated', 'public.claim_rewarded_ad(text)', 'execute')
    and has_function_privilege('authenticated', 'public.rewarded_allowance()', 'execute'),
  'a signed-in learner may ask for a reward and read their allowance'
);

select ok(
  not has_function_privilege('anon', 'public.claim_rewarded_ad(text)', 'execute')
    and not has_function_privilege('anon', 'public.rewarded_allowance()', 'execute'),
  'and nobody who is not signed in'
);

select ok(
  not has_function_privilege('authenticated', 'public.rewarded_grants_today(uuid, text)', 'execute'),
  'the internals stay internal: a client cannot ask about another learner''s grants'
);

select ok(
  not has_table_privilege('authenticated', 'public.rewarded_ad_grants', 'insert')
    and not has_table_privilege('authenticated', 'public.rewarded_ad_grants', 'update')
    and not has_table_privilege('authenticated', 'public.rewarded_ad_grants', 'delete'),
  'there is no table-level WRITE grant to fall back on — reading your own is fine, forging '
  'one is not'
);

select * from finish();
rollback;

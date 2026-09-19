-- Entitlements and the webhook log (SPEC §31, §32, Phase 14).
--
-- This file guards the only thing in the product that costs money to get wrong. One rule
-- underpins every assertion: `user_entitlements` is written EXCLUSIVELY by Edge Functions
-- holding the service role, and a client cannot reach that write path by any route.
--
-- The second theme is reconciliation. The webhook re-fetches the whole subscriber rather than
-- applying the event it received, so absence revokes and event ordering stops mattering.

create extension if not exists pgtap with schema extensions;

begin;
select plan(50);

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

insert into auth.users (id, email) values
  ('cccc1414-0000-0000-0000-0000000000b1', 'billing-free@test.local'),
  ('cccc1414-0000-0000-0000-0000000000b2', 'billing-paid@test.local');

-- ---------------------------------------------------------------------------------------
-- Applying what RevenueCat reports (SPEC §31)
-- ---------------------------------------------------------------------------------------

select is(
  public.apply_entitlements(
    'cccc1414-0000-0000-0000-0000000000b2',
    '{"premium": {"is_active": true, "expires_at": "2099-01-01T00:00:00Z",
                  "product_id": "premium_monthly", "store": "app_store"},
      "no_ads":  {"is_active": true, "expires_at": "2099-01-01T00:00:00Z",
                  "product_id": "premium_monthly", "store": "app_store"}}'::jsonb
  ) ->> 'is_premium',
  'true',
  'a premium subscription grants premium'
);

select ok(
  (public.entitlement_state('cccc1414-0000-0000-0000-0000000000b2') ->> 'is_ad_free')::boolean,
  'and ad-free with it, because Premium products grant both entitlements (SPEC §32)'
);

select is(
  (select store from public.user_entitlements
   where user_id = 'cccc1414-0000-0000-0000-0000000000b2' and entitlement = 'premium'),
  'app_store',
  'the store and product are recorded, so a fixture is never mistaken for a real purchase'
);

select ok(
  public.has_entitlement('cccc1414-0000-0000-0000-0000000000b2', 'premium'),
  'and every gate in the product sees it — `has_entitlement` is the one check they all use'
);

/**
 * The heart of it. The webhook re-fetches the whole subscriber, so anything absent from that
 * payload is no longer held — which is what makes a RENEWAL arriving after the CANCELLATION
 * it precedes harmless.
 */
select is(
  public.apply_entitlements('cccc1414-0000-0000-0000-0000000000b2', '{}'::jsonb) ->> 'is_premium',
  'false',
  'an entitlement absent from the payload is revoked, not left behind'
);

select is(
  (select count(*)::integer from public.user_entitlements
   where user_id = 'cccc1414-0000-0000-0000-0000000000b2'),
  2,
  'revoked rather than deleted, so the row keeps where it came from and when it changed'
);

select ok(
  not public.has_entitlement('cccc1414-0000-0000-0000-0000000000b2', 'premium'),
  'and the gates close again immediately'
);

select is(
  public.apply_entitlements(
    'cccc1414-0000-0000-0000-0000000000b2',
    '{"no_ads": {"is_active": true, "product_id": "no_ads_monthly", "store": "play_store"}}'::jsonb
  ) ->> 'is_ad_free',
  'true',
  'a downgrade to No Ads leaves exactly that'
);

select ok(
  not public.has_entitlement('cccc1414-0000-0000-0000-0000000000b2', 'premium'),
  'and does not quietly keep premium alive'
);

select is(
  (select expires_at from public.user_entitlements
   where user_id = 'cccc1414-0000-0000-0000-0000000000b2' and entitlement = 'no_ads'),
  null,
  'an entitlement with no expiry never lapses — a lifetime purchase, not a bug'
);

-- An expiry in the past means lapsed, whatever `is_active` claims.
select public.apply_entitlements(
  'cccc1414-0000-0000-0000-0000000000b2',
  '{"premium": {"is_active": true, "expires_at": "2020-01-01T00:00:00Z"}}'::jsonb
);

select ok(
  not public.has_entitlement('cccc1414-0000-0000-0000-0000000000b2', 'premium'),
  'a subscription whose expiry has passed grants nothing, however it is flagged'
);

select is(
  jsonb_array_length(
    public.entitlement_state('cccc1414-0000-0000-0000-0000000000b2') -> 'active'
  ),
  0,
  'and does not appear in the active list either'
);

select lives_ok(
  $$select public.apply_entitlements('cccc1414-0000-0000-0000-0000000000b1',
      '{"some_future_tier": {"is_active": true}}'::jsonb)$$,
  'an entitlement id this build has never heard of is skipped, not fatal'
);

select is(
  (select count(*)::integer from public.user_entitlements
   where user_id = 'cccc1414-0000-0000-0000-0000000000b1'),
  0,
  'and writes nothing — an old client must not fail its whole sync over a new tier'
);

select throws_ok(
  $$select public.apply_entitlements('cccc1414-0000-0000-0000-00000000dead', '{}'::jsonb)$$,
  'P0002',
  null,
  'entitlements cannot be granted to a user who does not exist'
);

select throws_ok(
  $$select public.apply_entitlements('cccc1414-0000-0000-0000-0000000000b1', '"nonsense"'::jsonb)$$,
  '22023',
  null,
  'nor from a payload that is not an object'
);

-- ---------------------------------------------------------------------------------------
-- A lifetime purchase versus a subscription (SPEC §33, D2)
-- ---------------------------------------------------------------------------------------
--
-- D2 allows No Ads to be sold as a one-time non-consumable. The difference is not cosmetic:
-- the paywall tells a No Ads SUBSCRIBER that Premium "replaces your current subscription --
-- you are not charged for both", and that sentence is false for somebody holding a permanent
-- purchase. `entitlement_state` has to make the two distinguishable.

select public.apply_entitlements(
  'cccc1414-0000-0000-0000-0000000000b1',
  '{"no_ads": {"is_active": true, "product_id": "no_ads_lifetime", "store": "app_store"}}'::jsonb
);

select is(
  public.entitlement_state('cccc1414-0000-0000-0000-0000000000b1') ->> 'no_ads_expires_at',
  null,
  'a lifetime No Ads purchase reports no expiry — the client reads that as "never lapses"'
);

select is(
  public.entitlement_state('cccc1414-0000-0000-0000-0000000000b1') ->> 'no_ads_product_id',
  'no_ads_lifetime',
  'and names the product that granted it, so support need not open the RevenueCat dashboard'
);

select ok(
  public.has_entitlement('cccc1414-0000-0000-0000-0000000000b1', 'no_ads'),
  'and it is active, with nothing to renew'
);

select public.apply_entitlements(
  'cccc1414-0000-0000-0000-0000000000b1',
  '{"no_ads": {"is_active": true, "expires_at": "2099-01-01T00:00:00Z",
               "product_id": "no_ads_monthly", "store": "play_store"}}'::jsonb
);

select isnt(
  public.entitlement_state('cccc1414-0000-0000-0000-0000000000b1') ->> 'no_ads_expires_at',
  null,
  'a No Ads SUBSCRIPTION reports its expiry, which is what marks it replaceable'
);

-- Back to nothing, so the fixtures below start clean.
select public.apply_entitlements('cccc1414-0000-0000-0000-0000000000b1', '{}'::jsonb);

select is(
  public.entitlement_state('cccc1414-0000-0000-0000-0000000000b1') ->> 'no_ads_expires_at',
  null,
  'a revoked entitlement reports no expiry either — absence of access, not a lifetime grant'
);

-- ---------------------------------------------------------------------------------------
-- The client's view (SPEC §31)
-- ---------------------------------------------------------------------------------------

select public.apply_entitlements(
  'cccc1414-0000-0000-0000-0000000000b2',
  '{"premium": {"is_active": true, "product_id": "premium_annual", "store": "play_store"},
    "no_ads":  {"is_active": true, "product_id": "premium_annual", "store": "play_store"}}'::jsonb
);

select pg_temp.act_as('cccc1414-0000-0000-0000-0000000000b2');

select ok(
  (public.get_entitlements() ->> 'is_premium')::boolean,
  'a subscriber can read their own entitlements'
);

select is(
  jsonb_array_length(public.get_entitlements() -> 'active'),
  2,
  'with both of them listed'
);

select pg_temp.act_as('cccc1414-0000-0000-0000-0000000000b1');

select ok(
  not (public.get_entitlements() ->> 'is_premium')::boolean,
  'and a free learner reads their own — never somebody else''s'
);

select is(
  (select count(*)::integer from public.user_entitlements
   where user_id <> 'cccc1414-0000-0000-0000-0000000000b1'),
  0,
  'RLS shows each learner only their own rows, and never another''s'
);

-- ---------------------------------------------------------------------------------------
-- A client cannot grant itself anything (SPEC §31, §40)
-- ---------------------------------------------------------------------------------------

select throws_ok(
  $$insert into public.user_entitlements (user_id, entitlement, is_active)
    values ('cccc1414-0000-0000-0000-0000000000b1', 'premium', true)$$,
  '42501',
  null,
  'a client cannot insert an entitlement'
);

select throws_ok(
  $$update public.user_entitlements set is_active = true$$,
  '42501',
  null,
  'nor update one'
);

select throws_ok(
  $$delete from public.user_entitlements$$,
  '42501',
  null,
  'nor delete one'
);

select throws_ok(
  $$select public.apply_entitlements('cccc1414-0000-0000-0000-0000000000b1',
      '{"premium": {"is_active": true}}'::jsonb)$$,
  '42501',
  null,
  'and cannot reach the write path through the function either'
);

select throws_ok(
  $$select public.entitlement_state('cccc1414-0000-0000-0000-0000000000b2')$$,
  '42501',
  null,
  'a client cannot ask about another learner''s entitlements directly'
);

-- ---------------------------------------------------------------------------------------
-- The webhook log (SPEC §31)
-- ---------------------------------------------------------------------------------------

select throws_ok(
  $$select count(*) from public.billing_events$$,
  '42501',
  null,
  'nobody can read the webhook log — it holds raw payloads (SPEC §40)'
);

select throws_ok(
  $$select public.record_billing_event('evt_x', null, 'RENEWAL', '{}'::jsonb)$$,
  '42501',
  null,
  'and no client can write to it'
);

select pg_temp.act_as_owner();

select is(
  public.record_billing_event(
    'evt_1', 'cccc1414-0000-0000-0000-0000000000b2', 'INITIAL_PURCHASE', '{"a": 1}'::jsonb
  ),
  '{"recorded": true, "already_processed": false}'::jsonb,
  'a new delivery is recorded and needs work'
);

select is(
  public.record_billing_event(
    'evt_1', 'cccc1414-0000-0000-0000-0000000000b2', 'INITIAL_PURCHASE', '{"a": 1}'::jsonb
  ),
  '{"recorded": false, "already_processed": false}'::jsonb,
  'a retry of a delivery that never finished is NOT waved through as a duplicate'
);

select is(
  (select count(*)::integer from public.billing_events where event_id = 'evt_1'),
  1,
  'though it writes no second row — idempotency is the primary key, not a flag'
);

select public.mark_billing_event_processed('evt_1');

select is(
  public.record_billing_event(
    'evt_1', 'cccc1414-0000-0000-0000-0000000000b2', 'INITIAL_PURCHASE', '{"a": 1}'::jsonb
  ),
  '{"recorded": false, "already_processed": true}'::jsonb,
  'once it is finished, a replay is acknowledged and ignored'
);

select is(
  (select event_type from public.billing_events where event_id = 'evt_1'),
  'INITIAL_PURCHASE',
  'the event type is kept, for support and for reconstructing what happened'
);

select lives_ok(
  $$select public.record_billing_event('evt_2', 'cccc1414-0000-0000-0000-00000000dead',
      'RENEWAL', '{}'::jsonb)$$,
  'an event naming an account that no longer exists is still logged'
);

select is(
  (select user_id from public.billing_events where event_id = 'evt_2'),
  null,
  'with no user attached, rather than failing the whole delivery'
);

select throws_ok(
  $$select public.record_billing_event('   ', null, 'RENEWAL', '{}'::jsonb)$$,
  '22023',
  null,
  'an event with no id is refused — there would be nothing to deduplicate on'
);

-- ---------------------------------------------------------------------------------------
-- Dev fixtures (SPEC §31, §52)
-- ---------------------------------------------------------------------------------------

select is(
  (select count(*)::integer from public.user_entitlements
   where store = 'dev-seed' and user_id::text like '00000000-0000-4000-8000-%'),
  3,
  'the seeded test accounts carry entitlement fixtures'
);

select ok(
  (select bool_and(store = 'dev-seed') from public.user_entitlements
   where user_id::text like '00000000-0000-4000-8000-0000000000%'),
  'every one of them is tagged `dev-seed`, so it can never be mistaken for a real purchase '
  '— and a production database is checked for exactly this before release (SPEC §31)'
);

-- ---------------------------------------------------------------------------------------
-- Grants (SPEC §40)
-- ---------------------------------------------------------------------------------------

select ok(
  has_function_privilege('authenticated', 'public.get_entitlements()', 'execute'),
  'a signed-in learner may read their own entitlements'
);

select ok(
  not has_function_privilege('anon', 'public.get_entitlements()', 'execute'),
  'and nobody who is not signed in'
);

select ok(
  not has_function_privilege('authenticated', 'public.apply_entitlements(uuid, jsonb)', 'execute')
    and not has_function_privilege('anon', 'public.apply_entitlements(uuid, jsonb)', 'execute'),
  'granting paid access is reachable by no client role at all'
);

select ok(
  has_function_privilege('service_role', 'public.apply_entitlements(uuid, jsonb)', 'execute'),
  'only the service role the Edge Functions hold can do it'
);

select ok(
  has_function_privilege('service_role', 'public.record_billing_event(text, uuid, text, jsonb)', 'execute')
    and has_function_privilege('service_role', 'public.mark_billing_event_processed(text)', 'execute'),
  'and the same role owns the webhook log'
);

select ok(
  not has_function_privilege('authenticated', 'public.record_billing_event(text, uuid, text, jsonb)', 'execute'),
  'which a client cannot write to even indirectly'
);

select ok(
  not has_table_privilege('authenticated', 'public.user_entitlements', 'insert')
    and not has_table_privilege('authenticated', 'public.user_entitlements', 'update')
    and not has_table_privilege('authenticated', 'public.user_entitlements', 'delete'),
  'there is no table-level write grant to fall back on either'
);

select ok(
  not has_table_privilege('authenticated', 'public.billing_events', 'select'),
  'and no read grant on the webhook log'
);

select * from finish();
rollback;

-- CodeSprint — telling a lifetime purchase from a subscription (SPEC §33, D2, Phase 14).
--
-- D2 allows No Ads to be sold as a one-time non-consumable instead of, or alongside, the
-- monthly subscription. The database already stored everything needed for that — a lifetime
-- entitlement is simply one with no `expires_at` — but `entitlement_state` only reported the
-- premium expiry, so the client could not tell the two apart.
--
-- It has to. The paywall says "Upgrade to Premium — this replaces your current subscription"
-- to a No Ads subscriber, and that sentence is FALSE for somebody holding a lifetime purchase:
-- a non-consumable cannot be replaced, so they would keep it and pay for Premium as well.
-- Telling a customer they will not be charged twice when they will is exactly the kind of
-- claim SPEC §33 exists to prevent.

create or replace function public.entitlement_state(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'active', coalesce((
      select jsonb_agg(e.entitlement order by e.entitlement)
      from public.user_entitlements e
      where e.user_id = p_user_id
        and e.is_active
        and (e.expires_at is null or e.expires_at > now())
    ), '[]'::jsonb),
    'is_premium', public.has_entitlement(p_user_id, 'premium'),
    'is_ad_free', public.is_ad_free(p_user_id),
    'premium_expires_at', (
      select e.expires_at from public.user_entitlements e
      where e.user_id = p_user_id and e.entitlement = 'premium' and e.is_active
    ),

    -- Null while active means it never lapses: a lifetime purchase (D2). The client uses this
    -- to decide whether Premium is an upgrade that REPLACES what they hold, or a second,
    -- separate purchase alongside a non-consumable they keep either way.
    'no_ads_expires_at', (
      select e.expires_at from public.user_entitlements e
      where e.user_id = p_user_id and e.entitlement = 'no_ads' and e.is_active
    ),

    -- Which product granted it, so support can answer "what am I paying for?" without
    -- reaching for the RevenueCat dashboard.
    'no_ads_product_id', (
      select e.product_id from public.user_entitlements e
      where e.user_id = p_user_id and e.entitlement = 'no_ads' and e.is_active
    ),

    'updated_at', (
      select max(e.updated_at) from public.user_entitlements e where e.user_id = p_user_id
    )
  );
$$;

comment on function public.entitlement_state(uuid) is
  'The server''s view of one user''s paid access — the authority for every gate. Reports the '
  'no_ads expiry so a lifetime purchase can be told from a subscription (SPEC §31, §33, D2).';

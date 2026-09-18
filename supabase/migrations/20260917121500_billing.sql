-- CodeSprint — entitlements, the webhook log and the client's view of what it has paid for
-- (SPEC §31, §32, Phase 14).
--
-- One rule governs this entire file, and it is worth stating before any code:
--
--   `user_entitlements` is the ONLY authority for paid access. It is written exclusively by
--   Edge Functions holding the service role, never by the app, and every access check in the
--   product already reads it through `has_entitlement` (SPEC §31).
--
-- RevenueCat's `CustomerInfo` may make the UI react instantly — a purchase should feel
-- finished the moment it is — but it decides nothing. A client that lies about its
-- CustomerInfo gets a nicer-looking paywall and not one extra lesson.

-- ---------------------------------------------------------------------------------------
-- 1. Applying what RevenueCat says (SPEC §31)
-- ---------------------------------------------------------------------------------------

/**
 * Reconciles a user's entitlements against the full set RevenueCat reports.
 *
 * The important word is RECONCILES. The webhook does not apply a delta from the event it
 * received — it re-fetches the whole subscriber and passes the result here, and anything
 * absent from that payload is treated as no longer held. That is what makes event ordering
 * irrelevant (SPEC §31): a RENEWAL arriving after the CANCELLATION it precedes cannot
 * resurrect a lapsed subscription, because neither event is what is being applied.
 *
 * Shape:
 *   {"premium": {"is_active": true, "expires_at": "2026-10-18T…", "product_id": "…",
 *                "store": "app_store"}, …}
 *
 * An entitlement id this build does not know is skipped rather than fatal. RevenueCat can be
 * configured with entitlements a shipped app has never heard of, and an old client must not
 * fail its whole sync over one.
 */
create or replace function public.apply_entitlements(p_user_id uuid, p_entitlements jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
  v_value jsonb;
  v_seen public.entitlement_id[] := '{}';
  v_active boolean;
begin
  if p_user_id is null then
    raise exception 'a user is required' using errcode = '22023';
  end if;

  if p_entitlements is null or jsonb_typeof(p_entitlements) <> 'object' then
    raise exception 'entitlements must be an object' using errcode = '22023';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'unknown user' using errcode = 'P0002';
  end if;

  for v_key, v_value in select key, value from jsonb_each(p_entitlements) loop
    -- Not an entitlement this build understands. Skipped, not fatal.
    if v_key not in ('no_ads', 'premium') then
      continue;
    end if;

    if jsonb_typeof(v_value) <> 'object' then
      continue;
    end if;

    v_active := coalesce((v_value ->> 'is_active')::boolean, false);

    insert into public.user_entitlements
      (user_id, entitlement, is_active, expires_at, product_id, store)
    values (
      p_user_id,
      v_key::public.entitlement_id,
      v_active,
      nullif(v_value ->> 'expires_at', '')::timestamptz,
      nullif(v_value ->> 'product_id', ''),
      nullif(v_value ->> 'store', '')
    )
    on conflict (user_id, entitlement) do update set
      is_active = excluded.is_active,
      expires_at = excluded.expires_at,
      product_id = coalesce(excluded.product_id, public.user_entitlements.product_id),
      store = coalesce(excluded.store, public.user_entitlements.store),
      updated_at = now();

    v_seen := v_seen || v_key::public.entitlement_id;
  end loop;

  -- Absence is authoritative. An entitlement the subscriber no longer holds is deactivated
  -- rather than deleted, so the row keeps its history — which store it came from, and when it
  -- last changed.
  update public.user_entitlements e
  set is_active = false, updated_at = now()
  where e.user_id = p_user_id
    and e.is_active
    and not (e.entitlement = any (v_seen));

  return public.entitlement_state(p_user_id);
end;
$$;

comment on function public.apply_entitlements(uuid, jsonb) is
  'Reconciles a user''s entitlements against the full set RevenueCat reports. Service role '
  'only — the app never writes paid access (SPEC §31).';

/**
 * What a user currently holds, as the server sees it.
 *
 * `is_ad_free` is `no_ads OR premium` because Premium products grant both entitlements
 * (SPEC §32) — computed here rather than left to each caller to remember.
 */
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
    'updated_at', (
      select max(e.updated_at) from public.user_entitlements e where e.user_id = p_user_id
    )
  );
$$;

comment on function public.entitlement_state(uuid) is
  'The server''s view of one user''s paid access — the authority for every gate (SPEC §31).';

/** The caller's own entitlements, for the UI to reflect. Never an input to a gate. */
create or replace function public.get_entitlements()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.entitlement_state(public.require_auth_uid());
$$;

comment on function public.get_entitlements() is
  'The caller''s entitlement state. The UI reflects it; the SERVER enforces it (SPEC §31).';

-- ---------------------------------------------------------------------------------------
-- 2. Webhook idempotency (SPEC §31)
-- ---------------------------------------------------------------------------------------

/**
 * Records a webhook delivery, and says what the caller should do with it.
 *
 * RevenueCat retries on any non-2xx, and will happily deliver the same event twice on a
 * timeout it never saw the answer to. `billing_events.event_id` is the primary key, so a
 * replay inserts nothing — idempotency is structural rather than remembered.
 *
 * But "already seen" is not the same as "already done". A delivery whose sync failed halfway
 * leaves a row with `processed_at` still null, and the retry that follows MUST be allowed to
 * finish the work rather than being waved through as a duplicate. So this returns both facts
 * and lets the caller decide:
 *
 *   {"recorded": true,  "already_processed": false}  → new, do the work
 *   {"recorded": false, "already_processed": false}  → a retry of something that failed, redo it
 *   {"recorded": false, "already_processed": true}   → genuinely done, acknowledge and stop
 *
 * The raw payload is kept for support and for reconstructing what happened; `billing_events`
 * has RLS with no read policy at all, so no client can ever read it.
 */
create or replace function public.record_billing_event(
  p_event_id text,
  p_user_id uuid,
  p_event_type text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recorded integer := 0;
  v_processed timestamptz;
begin
  if p_event_id is null or btrim(p_event_id) = '' then
    raise exception 'an event id is required' using errcode = '22023';
  end if;

  insert into public.billing_events (event_id, user_id, event_type, payload)
  values (
    p_event_id,
    -- The app user id RevenueCat carries may belong to a deleted account, or be an anonymous
    -- RevenueCat id that never mapped to one. The event is still worth logging.
    (select u.id from auth.users u where u.id = p_user_id),
    coalesce(p_event_type, 'unknown'),
    coalesce(p_payload, '{}'::jsonb)
  )
  on conflict (event_id) do nothing;

  get diagnostics v_recorded = row_count;

  select b.processed_at into v_processed
  from public.billing_events b where b.event_id = p_event_id;

  return jsonb_build_object(
    'recorded', v_recorded > 0,
    'already_processed', v_processed is not null
  );
end;
$$;

comment on function public.record_billing_event(text, uuid, text, jsonb) is
  'Logs a webhook delivery and reports whether it still needs work. A retry of a failed '
  'delivery is NOT treated as a duplicate (SPEC §31).';

/** Marks an event as fully handled, so an unprocessed one is visible in Studio. */
create or replace function public.mark_billing_event_processed(p_event_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.billing_events set processed_at = now()
  where event_id = p_event_id and processed_at is null;
$$;

-- ---------------------------------------------------------------------------------------
-- 3. Grants (SPEC §40)
-- ---------------------------------------------------------------------------------------
--
-- `service_role` needs an EXPLICIT grant here. Revoking from PUBLIC removes the implicit
-- privilege from every role including service_role, which is not a superuser — without these
-- three lines the Edge Functions would fail with "permission denied for function".

revoke all on function public.apply_entitlements(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.entitlement_state(uuid) from public, anon, authenticated;
revoke all on function public.record_billing_event(text, uuid, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.mark_billing_event_processed(text) from public, anon, authenticated;
revoke all on function public.get_entitlements() from public, anon, authenticated;

grant execute on function public.apply_entitlements(uuid, jsonb) to service_role;
grant execute on function public.record_billing_event(text, uuid, text, jsonb) to service_role;
grant execute on function public.mark_billing_event_processed(text) to service_role;
grant execute on function public.entitlement_state(uuid) to service_role;

grant execute on function public.get_entitlements() to authenticated;

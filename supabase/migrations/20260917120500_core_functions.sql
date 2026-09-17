-- CodeSprint — core server-authoritative functions (SPEC §19, §31, §40).
--
-- Every function here is SECURITY DEFINER with `search_path = ''` and fully schema-qualified
-- names, requires auth.uid(), and validates its inputs. EXECUTE is revoked from anon/public
-- and granted only where a client genuinely needs it.
--
-- Backward compatibility (SPEC §51): old app versions stay installed, so changes to these
-- signatures must be additive. A breaking change ships as a new `_v2` function.

-- ---------------------------------------------------------------------------------------
-- Config access
-- ---------------------------------------------------------------------------------------

create or replace function public.config_int(p_key text, p_default integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (value #>> '{}')::integer from public.app_config where key = p_key),
                  p_default);
$$;

comment on function public.config_int(text, integer) is
  'Internal: reads a numeric config value, falling back to the supplied default.';

-- Returns every public key as one object, so the app makes a single round trip at start-up.
create or replace function public.get_app_config()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
  from public.app_config
  where is_public;
$$;

comment on function public.get_app_config() is
  'All public config keys as a single JSON object (SPEC §50). Private keys never appear.';

-- ---------------------------------------------------------------------------------------
-- Entitlements (SPEC §31)
-- ---------------------------------------------------------------------------------------
--
-- THE authority for paid access. Access control must call this and never trust a client
-- flag, AsyncStorage, SecureStore or a RevenueCat CustomerInfo mirror.

create or replace function public.has_entitlement(p_user_id uuid, p_entitlement public.entitlement_id)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_entitlements e
    where e.user_id = p_user_id
      and e.entitlement = p_entitlement
      and e.is_active
      -- A NULL expiry means a non-expiring grant; otherwise it must still be in the future.
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

comment on function public.has_entitlement(uuid, public.entitlement_id) is
  'Server-side entitlement check — the only source of truth for paid access (SPEC §31).';

-- Premium products grant both entitlements, so ad-free is premium OR no_ads (SPEC §32).
create or replace function public.is_ad_free(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_entitlement(p_user_id, 'no_ads')
      or public.has_entitlement(p_user_id, 'premium');
$$;

-- ---------------------------------------------------------------------------------------
-- Module gating (SPEC D5)
-- ---------------------------------------------------------------------------------------
--
-- Computed, not stored: moving the free boundary stays a config change with no migration
-- and no content republish.

create or replace function public.module_requires_premium(p_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    m.is_premium_override,
    m.order_index > public.config_int('free_module_count', 6)
  )
  from public.modules m
  where m.id = p_module_id;
$$;

create or replace function public.can_access_module(p_user_id uuid, p_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not public.module_requires_premium(p_module_id)
      or public.has_entitlement(p_user_id, 'premium');
$$;

comment on function public.can_access_module(uuid, uuid) is
  'Whether a user may open a module: free boundary from config, premium from entitlements.';

-- ---------------------------------------------------------------------------------------
-- The XP ledger (SPEC §19, decision §0.1.2)
-- ---------------------------------------------------------------------------------------
--
-- The single write path for XP in the entire product. Everything else calls this.
--
-- Idempotency is structural, not procedural: ON CONFLICT DO NOTHING against
-- UNIQUE (user_id, source_type, source_id) means a replayed request awards nothing and
-- returns 0. No caller has to remember to check first.
--
-- The ledger row, the user_stats total and the weekly leaderboard row are written in the
-- same statement sequence — and therefore the same transaction — so they cannot diverge.

create or replace function public.award_xp(
  p_user_id uuid,
  p_source_type text,
  p_source_id text,
  p_amount integer,
  p_counts_for_leaderboard boolean default true
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_awarded integer := 0;
  v_week date := public.iso_week_start();
begin
  if p_amount is null or p_amount <= 0 then
    return 0;
  end if;

  insert into public.xp_events (
    user_id, source_type, source_id, amount, counts_for_leaderboard, week_start
  )
  values (p_user_id, p_source_type, p_source_id, p_amount, p_counts_for_leaderboard, v_week)
  on conflict (user_id, source_type, source_id) do nothing
  returning amount into v_awarded;

  -- Already rewarded: a duplicate submission is a no-op, not an error.
  if v_awarded is null then
    return 0;
  end if;

  update public.user_stats
  set xp_total = xp_total + v_awarded
  where user_id = p_user_id;

  if p_counts_for_leaderboard then
    insert into public.leaderboard_weekly (week_start, user_id, xp)
    values (v_week, p_user_id, v_awarded)
    on conflict (week_start, user_id)
    do update set xp = public.leaderboard_weekly.xp + excluded.xp,
                  updated_at = now();
  end if;

  return v_awarded;
end;
$$;

comment on function public.award_xp(uuid, text, text, integer, boolean) is
  'The only write path for XP. Idempotent by unique constraint; updates the ledger, '
  'user_stats and the weekly leaderboard in one transaction (SPEC §19).';

-- ---------------------------------------------------------------------------------------
-- Profile bootstrap
-- ---------------------------------------------------------------------------------------
--
-- Every auth user gets a profile and a stats row the moment they are created — including
-- anonymous guests (D1). Doing this in a trigger rather than in the app means there is no
-- window in which a signed-in user has no profile, and no client code path that can skip it.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, is_anonymous)
  values (new.id, coalesce(new.is_anonymous, false))
  on conflict (id) do nothing;

  insert into public.user_stats (user_id, lives)
  values (new.id, public.config_int('lives_max', 5))
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

comment on function public.handle_new_user() is
  'Creates profiles and user_stats rows for every new auth user, guests included.';

-- ---------------------------------------------------------------------------------------
-- Profile updates (SPEC §40: whitelisted columns only)
-- ---------------------------------------------------------------------------------------
--
-- `profiles` has no UPDATE policy. This RPC is the only way a client changes its profile,
-- which keeps the writable column list in exactly one place. A client cannot, for example,
-- set leaderboard_hidden = false after moderation hid them, or forge is_anonymous.

create or replace function public.update_profile(p_patch jsonb)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
  v_timezone text;
  v_row public.profiles;
begin
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'patch must be a JSON object' using errcode = '22023';
  end if;

  -- An invalid IANA name would silently break every streak calculation for this user, so
  -- it is rejected at the door rather than coerced (SPEC §21).
  if p_patch ? 'timezone' then
    v_timezone := p_patch ->> 'timezone';
    if not exists (select 1 from pg_catalog.pg_timezone_names where name = v_timezone) then
      raise exception 'unknown timezone: %', v_timezone using errcode = '22023';
    end if;
  end if;

  update public.profiles p
  set
    display_name = case when p_patch ? 'display_name'
                        then nullif(trim(p_patch ->> 'display_name'), '')
                        else p.display_name end,
    avatar_key = coalesce(p_patch ->> 'avatar_key', p.avatar_key),
    birth_year = case when p_patch ? 'birth_year'
                      then (p_patch ->> 'birth_year')::integer
                      else p.birth_year end,
    locale = coalesce(p_patch ->> 'locale', p.locale),
    timezone = coalesce(v_timezone, p.timezone),
    experience_level = case when p_patch ? 'experience_level'
                            then p_patch ->> 'experience_level'
                            else p.experience_level end,
    motivation = case when p_patch ? 'motivation'
                      then p_patch ->> 'motivation'
                      else p.motivation end,
    daily_goal_minutes = case when p_patch ? 'daily_goal_minutes'
                              then (p_patch ->> 'daily_goal_minutes')::integer
                              else p.daily_goal_minutes end,
    reminder_time = case when p_patch ? 'reminder_time'
                         then nullif(p_patch ->> 'reminder_time', '')::time
                         else p.reminder_time end,
    leaderboard_hidden = case when p_patch ? 'leaderboard_hidden'
                              then (p_patch ->> 'leaderboard_hidden')::boolean
                              else p.leaderboard_hidden end,
    analytics_consent = case when p_patch ? 'analytics_consent'
                             then (p_patch ->> 'analytics_consent')::boolean
                             else p.analytics_consent end,
    ads_consent_status = coalesce(p_patch ->> 'ads_consent_status', p.ads_consent_status),
    onboarding_completed_at = case
      when (p_patch ->> 'onboarding_completed')::boolean is true
        then coalesce(p.onboarding_completed_at, now())
      else p.onboarding_completed_at end,
    last_seen_at = now()
  where p.id = v_uid
  returning p.* into v_row;

  return v_row;
end;
$$;

comment on function public.update_profile(jsonb) is
  'The only client write path into profiles. Whitelists columns and validates the timezone; '
  'is_anonymous and moderation flags are deliberately not writable.';

-- ---------------------------------------------------------------------------------------
-- Session heartbeat (SPEC §12, §21)
-- ---------------------------------------------------------------------------------------

create or replace function public.sync_session(p_timezone text default null)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
  v_row public.profiles;
begin
  update public.profiles p
  set last_seen_at = now(),
      timezone = case
        when p_timezone is not null
          and exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone)
        then p_timezone
        else p.timezone
      end
  where p.id = v_uid
  returning p.* into v_row;

  return v_row;
end;
$$;

comment on function public.sync_session(text) is
  'Called on app open: refreshes last_seen_at and accepts a timezone change (SPEC §21).';

-- ---------------------------------------------------------------------------------------
-- EXECUTE grants (SPEC §40)
-- ---------------------------------------------------------------------------------------
--
-- Default-deny: nothing in this schema is callable by a client unless listed here.
-- Internal helpers (award_xp, config_int, handle_new_user, has_entitlement, ...) are called
-- only from other SECURITY DEFINER functions and stay ungranted.

revoke all on function public.get_app_config() from public, anon, authenticated;
revoke all on function public.update_profile(jsonb) from public, anon, authenticated;
revoke all on function public.sync_session(text) from public, anon, authenticated;

-- Config is readable before sign-in so the force-update screen can work.
grant execute on function public.get_app_config() to anon, authenticated;
grant execute on function public.update_profile(jsonb) to authenticated;
grant execute on function public.sync_session(text) to authenticated;

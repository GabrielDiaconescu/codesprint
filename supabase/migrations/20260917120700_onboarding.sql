-- CodeSprint — onboarding, the age gate and minor protections (SPEC §11, §41, Phase 5).
--
-- Phase 3 already gave `update_profile` the whole onboarding whitelist. What was missing is
-- the part that cannot live in the client: a 14-year-old's app can send
-- `analytics_consent = true` just as easily as anyone else's, and a privacy protection that
-- a client can switch off is not a protection. Every rule in §41 is enforced here.

-- ---------------------------------------------------------------------------------------
-- 1. Age thresholds live in config, not in code
-- ---------------------------------------------------------------------------------------

insert into public.app_config (key, value, is_public, description) values
  ('min_user_age', '13'::jsonb, true,
   'Minimum age to hold an account (SPEC D10). Below this, the account is refused.'),
  ('minor_protection_age', '16'::jsonb, true,
   'Below this age the §41 privacy defaults are forced: no analytics, no personalised ads, hidden from the leaderboard.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------------------
-- 2. Age from a birth year
-- ---------------------------------------------------------------------------------------
--
-- SPEC §11 collects the birth YEAR only, never a full date, because a year is enough for an
-- age gate and a date is more personal data than the product needs.
--
-- The consequence is a ±1 year window: someone born in 2013 is 12 or 13 during 2026 depending
-- on their birthday. This returns the age they reach during the current year, so the boundary
-- is "the year you turn 13" rather than "your thirteenth birthday". That is the ordinary
-- reading of a year-only gate, and it is stated here so the imprecision is deliberate and
-- visible rather than an accident of arithmetic.

create or replace function public.age_from_birth_year(p_birth_year integer)
returns integer
language sql
stable
set search_path = ''
as $$
  select case
    when p_birth_year is null then null
    else extract(year from pg_catalog.now())::integer - p_birth_year
  end;
$$;

comment on function public.age_from_birth_year(integer) is
  'Age reached during the current year. Birth year only, per SPEC §11.';

/**
 * Whether the §41 privacy defaults apply to this user.
 *
 * An unknown birth year counts as a minor. Someone who has not answered the age gate is
 * exactly the case where guessing wrong is expensive, so it fails closed.
 */
create or replace function public.is_minor(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.age_from_birth_year(
      (select p.birth_year from public.profiles p where p.id = p_user_id)
    ) < public.config_int('minor_protection_age', 16),
    true
  );
$$;

comment on function public.is_minor(uuid) is
  'True below minor_protection_age. An unknown birth year fails closed (SPEC §41).';

-- ---------------------------------------------------------------------------------------
-- 3. update_profile, now enforcing the age rules
-- ---------------------------------------------------------------------------------------
--
-- Replaced rather than edited: the Phase 3 migration is applied and must never change
-- (SPEC §59.28). The whitelist is identical; what is new is that the minor defaults are
-- applied AFTER the patch, so a client cannot opt a 15-year-old into analytics, into
-- personalised ads, or onto the leaderboard.

create or replace function public.update_profile(p_patch jsonb)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
  v_timezone text;
  v_birth_year integer;
  v_age integer;
  v_is_minor boolean;
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

  -- The effective birth year: what this call sets, or what is already stored. Onboarding
  -- sends the age answer and the consent answers together, so both orders must work.
  select coalesce(
    case when p_patch ? 'birth_year' then (p_patch ->> 'birth_year')::integer else null end,
    p.birth_year
  )
  into v_birth_year
  from public.profiles p
  where p.id = v_uid;

  v_age := public.age_from_birth_year(v_birth_year);

  -- Belt and braces. `reject_underage_account` is what onboarding actually calls; this stops
  -- an under-age profile being written by any other path.
  if v_age is not null and v_age < public.config_int('min_user_age', 13) then
    raise exception 'below the minimum age' using errcode = '22023';
  end if;

  v_is_minor := coalesce(v_age < public.config_int('minor_protection_age', 16), true);

  update public.profiles p
  set
    display_name = case when p_patch ? 'display_name'
                        then nullif(trim(p_patch ->> 'display_name'), '')
                        else p.display_name end,
    avatar_key = coalesce(p_patch ->> 'avatar_key', p.avatar_key),
    birth_year = coalesce(v_birth_year, p.birth_year),
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

    -- §41: hidden by default for minors, and they cannot turn it back on.
    leaderboard_hidden = case
      when v_is_minor then true
      when p_patch ? 'leaderboard_hidden' then (p_patch ->> 'leaderboard_hidden')::boolean
      else p.leaderboard_hidden end,

    -- §41: analytics is off for minors regardless of what the client sends.
    analytics_consent = case
      when v_is_minor then false
      when p_patch ? 'analytics_consent' then (p_patch ->> 'analytics_consent')::boolean
      else p.analytics_consent end,

    -- §41 / §30: minors get non-personalised ads only. 'restricted' is a terminal state the
    -- client cannot overwrite; Phase 15 reads it before requesting a personalised ad.
    ads_consent_status = case
      when v_is_minor then 'restricted'
      else coalesce(p_patch ->> 'ads_consent_status', p.ads_consent_status) end,

    onboarding_completed_at = case
      when (p_patch ->> 'onboarding_completed')::boolean is true
        then coalesce(p.onboarding_completed_at, pg_catalog.now())
      else p.onboarding_completed_at end,
    last_seen_at = pg_catalog.now()
  where p.id = v_uid
  returning p.* into v_row;

  return v_row;
end;
$$;

comment on function public.update_profile(jsonb) is
  'The only client write path into profiles. Whitelists columns, validates the timezone, and '
  'enforces the SPEC §41 minor protections server-side.';

-- ---------------------------------------------------------------------------------------
-- 4. Refusing an under-age account
-- ---------------------------------------------------------------------------------------
--
-- SPEC §11 and §41: under the minimum age, the user cannot have an account. Signing them out
-- and leaving the row behind would not satisfy that — the account would still exist, and for
-- a registered user we would be storing a child's email address indefinitely.
--
-- This deletes the CALLER and nobody else: there is no user id parameter to get wrong, and
-- the cascade removes the profile and stats with it. Deleting your own account is something
-- a user may do anyway (SPEC §41), so no privilege is being granted here that they did not
-- already have — only an early, specific path to it.
--
-- The general account-deletion flow (Phase 18) additionally requests customer deletion in
-- RevenueCat. Nothing has been purchased at the age gate, so a plain delete is complete here.

create or replace function public.reject_underage_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
begin
  delete from auth.users u where u.id = v_uid;
end;
$$;

comment on function public.reject_underage_account() is
  'Deletes the calling user. Used by the onboarding age gate when the user is under age.';

-- ---------------------------------------------------------------------------------------
-- 5. Grants (SPEC §40, default-deny)
-- ---------------------------------------------------------------------------------------

revoke all on function public.age_from_birth_year(integer) from public, anon, authenticated;
revoke all on function public.is_minor(uuid) from public, anon, authenticated;
revoke all on function public.reject_underage_account() from public, anon, authenticated;

-- Only the age gate is client-callable. The two helpers are read by other SECURITY DEFINER
-- functions and by Phase 15's ad gating, never by the app.
grant execute on function public.reject_underage_account() to authenticated;

-- CodeSprint — rewards for watching an ad (SPEC §19, §22, §30, §42, Phase 15).
--
-- The rule that shapes this file: **the client never grants itself anything.** It watches an
-- ad, AdMob tells it the reward was earned, and it asks the server — which decides, applies a
-- daily cap, and writes the grant.
--
-- In V1 the server cannot verify that the ad was really watched; AdMob's server-side
-- verification is V1.1 (SPEC §42). So the honest description of what these caps do is: they
-- bound the damage. Somebody calling the RPC in a loop gets three lives and thirty XP a day,
-- the same as somebody who sat through three adverts. That is a nuisance, not an exploit —
-- and it is exactly why a rewarded ad must never grant Premium content (SPEC §30).

-- ---------------------------------------------------------------------------------------
-- 1. Config (SPEC §19, §30, §50)
-- ---------------------------------------------------------------------------------------

insert into public.app_config (key, value, is_public, description) values
  ('rewarded_xp_per_ad', '10'::jsonb, true,
   'Bonus XP for one rewarded ad. Never counts towards the leaderboard (SPEC §19).'),
  ('rewarded_xp_max_per_day', '30'::jsonb, true,
   'Most bonus XP one learner can earn from ads in a local day (SPEC §19, §42).')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------------------
-- 2. The daily allowance (SPEC §30, §42)
-- ---------------------------------------------------------------------------------------

/**
 * How many of this reward the learner has already been granted today.
 *
 * Keyed on their LOCAL date, like every other daily limit in the product (SPEC §21), so the
 * allowance resets at their midnight rather than at UTC's.
 */
create or replace function public.rewarded_grants_today(p_user_id uuid, p_reward_type text)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_timezone text;
begin
  select coalesce(p.timezone, 'UTC') into v_timezone
  from public.profiles p where p.id = p_user_id;

  return (
    select count(*)::integer
    from public.rewarded_ad_grants g
    where g.user_id = p_user_id
      and g.reward_type = p_reward_type
      and g.local_date = public.local_date_for(coalesce(v_timezone, 'UTC'))
  );
end;
$$;

comment on function public.rewarded_grants_today(uuid, text) is
  'Rewarded-ad grants of one type on the user''s local day, for the cap (SPEC §30, §42).';

/**
 * What the learner could still earn from ads today.
 *
 * Read by the UI so a rewarded-ad button can be hidden BEFORE it is offered, rather than
 * offering a reward and refusing it after the learner has sat through thirty seconds of
 * advertising. That would be the worst possible order of events.
 */
create or replace function public.rewarded_allowance()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
  v_life_cap integer := public.config_int('rewarded_life_restores_per_day', 3);
  v_xp_cap integer := public.config_int('rewarded_xp_max_per_day', 30);
  v_xp_each integer := public.config_int('rewarded_xp_per_ad', 10);
  v_lives jsonb := public.lives_state(v_uid);
  v_xp_today integer;
begin
  select coalesce(sum(e.amount), 0)::integer into v_xp_today
  from public.xp_events e
  where e.user_id = v_uid
    and e.source_type = 'rewarded_ad'
    and public.local_date_for(
          coalesce((select p.timezone from public.profiles p where p.id = v_uid), 'UTC'),
          e.created_at
        ) = public.local_date_for(
          coalesce((select p.timezone from public.profiles p where p.id = v_uid), 'UTC')
        );

  return jsonb_build_object(
    'ads_enabled', public.config_bool('ads_enabled', true),
    -- Nothing to restore for somebody whose lives are unlimited or already full.
    'life', jsonb_build_object(
      'available', not (v_lives ->> 'unlimited')::boolean
                   and (v_lives ->> 'lives')::integer < (v_lives ->> 'max')::integer
                   and public.rewarded_grants_today(v_uid, 'life') < v_life_cap,
      'used', public.rewarded_grants_today(v_uid, 'life'),
      'cap', v_life_cap
    ),
    'bonus_xp', jsonb_build_object(
      'available', v_xp_today + v_xp_each <= v_xp_cap,
      'amount', v_xp_each,
      'earned', v_xp_today,
      'cap', v_xp_cap
    )
  );
end;
$$;

comment on function public.rewarded_allowance() is
  'What the caller could still earn from rewarded ads today, so the UI never offers a reward '
  'it would then refuse (SPEC §30).';

-- ---------------------------------------------------------------------------------------
-- 3. Claiming (SPEC §19, §22, §30)
-- ---------------------------------------------------------------------------------------

/**
 * Grants the reward for a watched ad.
 *
 * Refuses rather than silently no-ops, because every refusal here is something the UI should
 * have prevented and the learner deserves to be told about:
 *
 *   `22023 rewarded unavailable: <reason>` — ads_disabled, cap_reached, lives_full,
 *                                            unlimited_lives, unknown_reward
 *
 * A rewarded ad never grants Premium content (SPEC §30). The most it can do is give back a
 * life the learner would have waited four hours for, or a little XP that deliberately does
 * **not** count towards the leaderboard (SPEC §19) — because minutes of advertising should
 * never outrank minutes of learning.
 */
create or replace function public.claim_rewarded_ad(p_reward_type text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
  v_timezone text;
  v_today date;
  v_lives jsonb;
  v_max integer;
  v_granted integer := 0;
  v_xp_each integer;
  v_xp_cap integer;
  v_xp_today integer;
begin
  if not public.config_bool('ads_enabled', true) then
    raise exception 'rewarded unavailable: ads_disabled' using errcode = '22023';
  end if;

  if p_reward_type not in ('life', 'bonus_xp') then
    raise exception 'rewarded unavailable: unknown_reward' using errcode = '22023';
  end if;

  select coalesce(p.timezone, 'UTC') into v_timezone from public.profiles p where p.id = v_uid;
  v_timezone := coalesce(v_timezone, 'UTC');
  v_today := public.local_date_for(v_timezone);

  if p_reward_type = 'life' then
    -- Settle any regeneration owed first, so a learner who has been away is not handed a
    -- rewarded life on top of one they had already earned by waiting.
    perform public.regenerate_lives(v_uid);

    v_lives := public.lives_state(v_uid);
    v_max := public.config_int('lives_max', 5);

    if (v_lives ->> 'unlimited')::boolean then
      raise exception 'rewarded unavailable: unlimited_lives' using errcode = '22023';
    end if;

    if (v_lives ->> 'lives')::integer >= v_max then
      -- Refused rather than burning one of their three daily grants on nothing.
      raise exception 'rewarded unavailable: lives_full' using errcode = '22023';
    end if;

    if public.rewarded_grants_today(v_uid, 'life')
       >= public.config_int('rewarded_life_restores_per_day', 3) then
      raise exception 'rewarded unavailable: cap_reached' using errcode = '22023';
    end if;

    insert into public.rewarded_ad_grants (user_id, reward_type, local_date)
    values (v_uid, 'life', v_today);

    update public.user_stats
    set lives = least(lives + 1, v_max)
    where user_id = v_uid;

    v_granted := 1;

  else
    v_xp_each := public.config_int('rewarded_xp_per_ad', 10);
    v_xp_cap := public.config_int('rewarded_xp_max_per_day', 30);

    select coalesce(sum(e.amount), 0)::integer into v_xp_today
    from public.xp_events e
    where e.user_id = v_uid
      and e.source_type = 'rewarded_ad'
      and public.local_date_for(v_timezone, e.created_at) = v_today;

    if v_xp_today + v_xp_each > v_xp_cap then
      raise exception 'rewarded unavailable: cap_reached' using errcode = '22023';
    end if;

    insert into public.rewarded_ad_grants (user_id, reward_type, local_date)
    values (v_uid, 'bonus_xp', v_today);

    -- `counts_for_leaderboard => false`: watching adverts must never move somebody up the
    -- ranking past somebody who answered questions (SPEC §19, §26).
    v_granted := public.award_xp(
      v_uid,
      'rewarded_ad',
      v_today::text || ':' || public.rewarded_grants_today(v_uid, 'bonus_xp')::text,
      v_xp_each,
      false
    );
  end if;

  return jsonb_build_object(
    'reward_type', p_reward_type,
    'granted', v_granted,
    'lives', public.lives_state(v_uid),
    'allowance', public.rewarded_allowance()
  );
end;
$$;

comment on function public.claim_rewarded_ad(text) is
  'Grants a rewarded-ad reward under a server-side daily cap. Never grants Premium content, '
  'and its XP never counts towards the leaderboard (SPEC §19, §30, §42).';

-- ---------------------------------------------------------------------------------------
-- 4. Grants (SPEC §40)
-- ---------------------------------------------------------------------------------------

revoke all on function public.rewarded_grants_today(uuid, text) from public, anon, authenticated;
revoke all on function public.rewarded_allowance() from public, anon, authenticated;
revoke all on function public.claim_rewarded_ad(text) from public, anon, authenticated;

grant execute on function public.rewarded_allowance() to authenticated;
grant execute on function public.claim_rewarded_ad(text) to authenticated;

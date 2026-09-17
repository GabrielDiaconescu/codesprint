-- CodeSprint — authentication support (SPEC §12, Phase 4).
--
-- Phase 3 created `handle_new_user`, which gives every auth user a profile and a stats row —
-- guests included. This migration adds the two things guest mode needs beyond creation:
--
--   1. keeping `profiles.is_anonymous` truthful when a guest becomes a real account, and
--   2. deleting guests that were abandoned, because anonymous users count toward Supabase
--      MAU billing forever otherwise (SPEC §12, §60).

-- ---------------------------------------------------------------------------------------
-- 1. Mirror auth.users.is_anonymous onto profiles
-- ---------------------------------------------------------------------------------------
--
-- Supabase flips auth.users.is_anonymous to false when an anonymous user confirms an email
-- or links an OAuth identity. Without mirroring that, a converted guest would keep
-- is_anonymous = true in our own table and stay invisible on the leaderboard forever
-- (SPEC §26: guests are not ranked) — a silent, permanent bug for exactly the users who
-- just signed up.

create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles p
  set is_anonymous = coalesce(new.is_anonymous, false)
  where p.id = new.id
    and p.is_anonymous is distinct from coalesce(new.is_anonymous, false);

  return new;
end;
$$;

comment on function public.handle_user_updated() is
  'Mirrors auth.users.is_anonymous onto profiles so a converted guest becomes rankable.';

drop trigger if exists on_auth_user_updated on auth.users;

create trigger on_auth_user_updated
  after update of is_anonymous on auth.users
  for each row
  execute function public.handle_user_updated();

-- ---------------------------------------------------------------------------------------
-- 2. Purge abandoned guest accounts
-- ---------------------------------------------------------------------------------------
--
-- Activity is measured by `profiles.last_seen_at`, which `sync_session()` refreshes on every
-- app open. auth.users.last_sign_in_at is NOT usable here: an anonymous session refreshes its
-- token without signing in again, so that column would freeze at account creation and delete
-- guests who are still using the app daily.
--
-- The `auth.identities` check is belt and braces. is_anonymous alone should be enough, but a
-- linked account wrongly deleted is unrecoverable, so a second, independent condition guards
-- the destructive path.

create or replace function public.delete_stale_anonymous_users(p_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  if p_days is null or p_days < 1 then
    raise exception 'retention window must be at least 1 day, got %', p_days
      using errcode = '22023';
  end if;

  with victims as (
    delete from auth.users u
    where coalesce(u.is_anonymous, false)
      and not exists (
        select 1 from auth.identities i where i.user_id = u.id
      )
      and exists (
        select 1
        from public.profiles p
        where p.id = u.id
          and p.last_seen_at < now() - make_interval(days => p_days)
      )
    returning 1
  )
  select count(*) into v_deleted from victims;

  return v_deleted;
end;
$$;

comment on function public.delete_stale_anonymous_users(integer) is
  'Deletes guest accounts with no linked identity and no activity for p_days (SPEC §12).';

-- Destructive and server-only: no client may ever call it (SPEC §40, default-deny).
revoke all on function public.delete_stale_anonymous_users(integer)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------
-- 3. Schedule the purge
-- ---------------------------------------------------------------------------------------
--
-- pg_cron rather than an Edge Function: this is maintenance, needs no network, and must not
-- depend on the app running (SPEC §60 — lazy computation and in-database jobs over workers).
--
-- 03:17 UTC is deliberately off the hour: cron schedules cluster at :00, and this competes
-- with nothing for the tiny window it runs in.

create extension if not exists pg_cron;

select cron.schedule(
  'codesprint-purge-anonymous-users',
  '17 3 * * *',
  $$select public.delete_stale_anonymous_users(30)$$
);

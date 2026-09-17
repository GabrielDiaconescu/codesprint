-- CodeSprint — foundation: extensions, shared helpers, and the updated_at trigger.
--
-- SPEC §39 conventions: UUID primary keys, timestamptz everywhere, created_at/updated_at
-- maintained by triggers, RLS enabled on EVERY table.
--
-- Security note (SPEC §40): every SECURITY DEFINER function in this project sets
-- `search_path = ''` and schema-qualifies every name. Without that, a caller can put a
-- malicious schema earlier on the search path and hijack an unqualified reference while the
-- function runs with the owner's privileges.

create extension if not exists "pgcrypto" with schema extensions;

-- ---------------------------------------------------------------------------------------
-- Shared enums
-- ---------------------------------------------------------------------------------------

create type public.difficulty_level as enum ('easy', 'medium', 'hard');

create type public.review_status as enum ('draft', 'reviewed');

create type public.question_type as enum (
  'multiple_choice',
  'multiple_select',
  'true_false',
  'predict_output',
  'fill_blank',
  'code_ordering',
  'debugging',
  'concept_matching',
  -- Reserved: schema only, never rendered in V1 (SPEC §16, flag coding_challenges_enabled).
  'coding_challenge'
);

create type public.answer_match_mode as enum (
  'exact',
  'trimmed',
  'whitespace_insensitive',
  'case_insensitive'
);

-- Contexts in which a question can be answered. Drives XP rules and life consumption
-- (SPEC §19, §22): exams never consume lives.
create type public.answer_context as enum ('lesson', 'practice', 'challenge', 'exam');

create type public.entitlement_id as enum ('no_ads', 'premium');

create type public.lesson_progress_status as enum ('in_progress', 'completed');

-- ---------------------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger helper: stamps updated_at on every UPDATE.';

-- ---------------------------------------------------------------------------------------
-- Identity helpers
-- ---------------------------------------------------------------------------------------

-- auth.uid() returns null for an unauthenticated request. Gameplay functions must never
-- silently operate on "no user", so they call this and fail loudly instead.
create or replace function public.require_auth_uid()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  return uid;
end;
$$;

comment on function public.require_auth_uid() is
  'Returns the calling user id, raising 28000 when the request is unauthenticated.';

-- ---------------------------------------------------------------------------------------
-- Time helpers (SPEC §21)
-- ---------------------------------------------------------------------------------------

-- The server — never the client — decides what "today" means for a user, so a device with a
-- tampered clock cannot manufacture streak days.
create or replace function public.local_date_for(p_timezone text, p_at timestamptz default now())
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  tz text := coalesce(p_timezone, 'UTC');
begin
  -- An unknown timezone must degrade to UTC rather than abort an answer submission.
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = tz) then
    tz := 'UTC';
  end if;
  return (p_at at time zone tz)::date;
end;
$$;

comment on function public.local_date_for(text, timestamptz) is
  'Local calendar date in an IANA timezone, falling back to UTC when the name is unknown.';

-- ISO week start (Monday 00:00 UTC), the leaderboard partition key (SPEC §26).
-- A new week is simply a new key, so no reset job is ever needed.
create or replace function public.iso_week_start(p_at timestamptz default now())
returns date
language sql
immutable
set search_path = ''
as $$
  select (date_trunc('week', p_at at time zone 'UTC'))::date;
$$;

comment on function public.iso_week_start(timestamptz) is
  'Monday of the ISO week in UTC — the leaderboard_weekly partition key.';

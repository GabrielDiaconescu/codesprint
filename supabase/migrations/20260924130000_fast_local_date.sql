-- Answers slowed down with every XP event a learner had ever earned (found in Phase 23).
--
-- local_date_for checked its timezone against pg_timezone_names on every call. That view
-- reads the whole timezone database from disk — about 30 ms a call — and the daily caps call
-- local_date_for once per row of the learner's history: leaderboard XP today, practice XP
-- today, rewarded grants today. A learner with about seventy answers behind them waited
-- sixteen seconds for the next one (SPEC §45 asks for 400 ms).
--
-- Same signature, same volatility, same answers: an unknown zone still degrades to UTC, now by
-- catching the error `at time zone` raises for it instead of scanning the catalogue first.
-- Timezones are validated where they are written (update_profile, sync_session), so the
-- fallback is a safety net, not a code path.

create or replace function public.local_date_for(p_timezone text, p_at timestamptz default now())
returns date
language plpgsql
immutable
set search_path = ''
as $$
begin
  return (p_at at time zone coalesce(p_timezone, 'UTC'))::date;
exception
  -- An unknown timezone must degrade to UTC rather than abort an answer submission.
  when invalid_parameter_value then
    return (p_at at time zone 'UTC')::date;
end;
$$;

comment on function public.local_date_for(text, timestamptz) is
  'Local calendar date in an IANA timezone, falling back to UTC when the name is unknown. Cheap: called once per row by the daily caps.';

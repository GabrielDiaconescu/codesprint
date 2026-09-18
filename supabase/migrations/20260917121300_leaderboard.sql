-- CodeSprint — the weekly leaderboard, display names and reports (SPEC §26, §29, §42,
-- Phase 12).
--
-- This is the first feature where one learner sees something belonging to another, which
-- makes it the first place a privacy mistake has a victim. Three rules shape everything here:
--
--   * an email address or an auth identifier must never leave the database (SPEC §26);
--   * a guest has no name and is never ranked;
--   * anyone can remove themselves, and moderation can remove anyone.

-- ---------------------------------------------------------------------------------------
-- 1. Display names (SPEC §26)
-- ---------------------------------------------------------------------------------------

/**
 * Names nobody may take.
 *
 * Deliberately short: it covers impersonation of the product and its staff, which is the
 * abuse a leaderboard actually invites. Matching happens after separators and case are
 * folded away, so `M O D` and `m.o.d` are the same word as `mod`.
 */
insert into public.app_config (key, value, is_public, description) values
  ('display_name_blocklist',
   '["admin","administrator","moderator","mod","staff","support","codesprint","official",
     "system","root","owner","team","help","null","undefined","anonymous","guest","me"]'::jsonb,
   false,
   'Reserved display names, matched exactly after folding case and separators (SPEC §26).'),

  -- Substring-matched, so these must be words that cannot appear innocently inside another.
  -- A real profanity filter is an arms race that cannot be won in one language, let alone the
  -- several this product will ship in — the Report action and moderation in Supabase Studio
  -- are the answer to everything this list misses (SPEC §26, §49). Being conservative here is
  -- deliberate: a false positive blocks a real person from their own name.
  ('display_name_profanity',
   '["fuck","shit","cunt","bitch","nigger","faggot","whore","wanker"]'::jsonb,
   false,
   'Substrings that make a display name unacceptable, matched after folding (SPEC §26).')
on conflict (key) do nothing;

/**
 * Why a display name is unacceptable, or null when it is fine.
 *
 * Returns a CODE rather than a sentence. The client turns it into localized copy; the
 * database has no business holding user-facing English (SPEC §38).
 */
create or replace function public.display_name_problem(p_name text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_folded text;
begin
  if v_name = '' then
    return 'required';
  end if;

  if char_length(v_name) < 3 then
    return 'too_short';
  end if;

  if char_length(v_name) > 20 then
    return 'too_long';
  end if;

  -- Letters and digits in any alphabet — `[[:alnum:]]` is locale-aware, so "Mărioară" and
  -- "Δημήτρης" are accepted — plus space, underscore, dot and hyphen BETWEEN them. Notably
  -- absent: markup, control characters, and the invisible codepoints (zero-width space and
  -- friends) that let one name imitate another.
  if v_name !~ '^[[:alnum:]][[:alnum:] _.-]*[[:alnum:]]$' then
    return 'invalid_characters';
  end if;

  -- Collapse the tricks used to walk past a word list: spacing, separators and case.
  v_folded := lower(regexp_replace(v_name, '[[:space:]_.-]', '', 'g'));

  if exists (
    select 1
    from public.app_config c,
         jsonb_array_elements_text(c.value) as blocked
    where c.key = 'display_name_blocklist'
      and v_folded = lower(regexp_replace(blocked, '[[:space:]_.-]', '', 'g'))
  ) then
    return 'reserved';
  end if;

  if exists (
    select 1
    from public.app_config c,
         jsonb_array_elements_text(c.value) as word
    where c.key = 'display_name_profanity'
      and strpos(v_folded, lower(word)) > 0
  ) then
    return 'not_allowed';
  end if;

  return null;
end;
$$;

comment on function public.display_name_problem(text) is
  'Validates a display name, returning a code the client localizes (SPEC §26, §38).';

/**
 * Enforces the rule at the table, not at one entry point.
 *
 * `update_profile` already accepts a display name and so does `set_display_name`; a third
 * path will appear the first time moderation renames somebody. Validating in a trigger means
 * the rule cannot be bypassed by taking a different route to the same column, and there is
 * exactly one copy of it to keep correct.
 *
 * Only a CHANGED name is checked, so a profile written for some unrelated reason is never
 * blocked by a name that predates a blocklist entry. Moderation renames such a user; the row
 * is not held hostage in the meantime.
 */
create or replace function public.validate_display_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_problem text;
begin
  if new.display_name is not null
     and (tg_op = 'INSERT' or new.display_name is distinct from old.display_name) then
    v_problem := public.display_name_problem(new.display_name);
    if v_problem is not null then
      raise exception 'display name rejected: %', v_problem using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_validate_display_name
  before insert or update of display_name on public.profiles
  for each row execute function public.validate_display_name();

/**
 * Sets the caller's display name.
 *
 * Separate from `update_profile` because a name is the one profile field other people see,
 * so it gets its own RPC with its own error codes — the screen that sets it has to tell
 * "too short" apart from "already taken", which a generic profile patch cannot do.
 *
 * Uniqueness is case-insensitive and ultimately guaranteed by
 * `profiles_display_name_unique_idx`; the explicit check exists to return a clean code rather
 * than a raw index violation, and the index still settles a race between two people claiming
 * the same name at the same moment.
 */
create or replace function public.set_display_name(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_problem text;
begin
  v_problem := public.display_name_problem(v_name);
  if v_problem is not null then
    raise exception 'display name rejected: %', v_problem using errcode = '22023';
  end if;

  if exists (
    select 1 from public.profiles p
    where p.id <> v_uid and lower(p.display_name) = lower(v_name)
  ) then
    raise exception 'display name taken' using errcode = '23505';
  end if;

  update public.profiles set display_name = v_name where id = v_uid;

  return jsonb_build_object('display_name', v_name);
exception
  when unique_violation then
    -- Lost the race described above.
    raise exception 'display name taken' using errcode = '23505';
end;
$$;

comment on function public.set_display_name(text) is
  'Sets the caller''s display name, validated and unique case-insensitively (SPEC §26).';

-- ---------------------------------------------------------------------------------------
-- 2. The per-day ranking cap (SPEC §26, §42)
-- ---------------------------------------------------------------------------------------
--
-- XP is never taken away. The ledger is append-only and the learner keeps every point they
-- earned, including their level and their achievements. What the cap limits is how much of a
-- single day can count towards the RANKING, so that one enormous session cannot outrank a
-- month of daily practice.
--
-- `award_xp` is replaced (never edited — SPEC §59.28) to consult it. The ledger row is
-- written either way; only the `leaderboard_weekly` increment is clamped.

create or replace function public.leaderboard_xp_today(p_user_id uuid)
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

  v_timezone := coalesce(v_timezone, 'UTC');

  return coalesce((
    select sum(e.amount)::integer
    from public.xp_events e
    where e.user_id = p_user_id
      and e.counts_for_leaderboard
      and public.local_date_for(v_timezone, e.created_at) = public.local_date_for(v_timezone)
  ), 0);
end;
$$;

comment on function public.leaderboard_xp_today(uuid) is
  'Leaderboard-eligible XP recorded in the ledger for the user''s local day (SPEC §42).';

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
  v_before integer;
  v_ranked integer;
  v_cap integer;
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

  -- The learner keeps all of this, whatever the ranking cap decides below.
  update public.user_stats
  set xp_total = xp_total + v_awarded
  where user_id = p_user_id;

  if p_counts_for_leaderboard then
    v_cap := public.config_int('leaderboard_daily_xp_cap', 2000);

    -- Today's ledger total already includes the row inserted above, so take it back out to
    -- get the figure from before this award.
    v_before := greatest(public.leaderboard_xp_today(p_user_id) - v_awarded, 0);

    -- Clamping against the UNCAPPED running total is what makes the day's credited total come
    -- to exactly `least(total_earned_today, cap)`: awards below the line count in full, the
    -- one that crosses it counts partially, and every award after it counts nothing.
    v_ranked := greatest(least(v_awarded, v_cap - v_before), 0);

    if v_ranked > 0 then
      insert into public.leaderboard_weekly (week_start, user_id, xp)
      values (v_week, p_user_id, v_ranked)
      on conflict (week_start, user_id)
      do update set xp = public.leaderboard_weekly.xp + excluded.xp,
                    updated_at = now();
    end if;
  end if;

  return v_awarded;
end;
$$;

comment on function public.award_xp(uuid, text, text, integer, boolean) is
  'The only write path for XP. Idempotent by unique constraint; the learner always keeps the '
  'full amount, and only what counts towards the weekly RANKING is capped per local day '
  '(SPEC §19, §26, §42).';

-- ---------------------------------------------------------------------------------------
-- 3. The leaderboard (SPEC §26)
-- ---------------------------------------------------------------------------------------

/**
 * Whether a user may appear in the ranking at all.
 *
 * Guests are excluded because they have no identity to attach a name to and are purged after
 * thirty days (SPEC §12). Hidden users are excluded whether they hid themselves from Settings
 * or moderation hid them (SPEC §26, §41). A user with no display name is excluded because
 * there would be nothing to show but an identifier.
 */
create or replace function public.leaderboard_eligible(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user_id
      and not p.is_anonymous
      and not p.leaderboard_hidden
      and p.display_name is not null
  );
$$;

comment on function public.leaderboard_eligible(uuid) is
  'Whether a user appears in the weekly ranking: named, registered and not hidden (SPEC §26).';

/**
 * The weekly ranking: the top of the table, plus the caller's own position and neighbours.
 *
 * Returns nothing but a display name, an avatar key and an XP figure. No email address, no
 * auth identifier, no birth year, no locale (SPEC §26, §40).
 *
 * The Supabase user id IS returned for ranked rows, because the Report action needs a target.
 * That id is pseudonymous — the same value analytics already uses as a distinct id (SPEC §43)
 * — and it identifies nobody outside this database.
 *
 * Read straight from `leaderboard_weekly` rather than re-aggregating `xp_events`: the ranking
 * is maintained in the same transaction that writes the ledger (SPEC §19), so the table is
 * already the answer and this is one index scan over one week.
 */
create or replace function public.get_leaderboard(p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
  v_week date := public.iso_week_start();
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_has_name boolean;
  v_hidden boolean;
  v_guest boolean;
  v_result jsonb;
begin
  select p.display_name is not null, p.leaderboard_hidden, p.is_anonymous
  into v_has_name, v_hidden, v_guest
  from public.profiles p
  where p.id = v_uid;

  with board as (
    select
      rank() over (order by b.xp desc, p.display_name asc) as rank,
      b.user_id,
      p.display_name,
      p.avatar_key,
      b.xp
    from public.leaderboard_weekly b
    join public.profiles p on p.id = b.user_id
    where b.week_start = v_week
      and b.xp > 0
      and not p.is_anonymous
      and not p.leaderboard_hidden
      and p.display_name is not null
  ),
  mine as (
    select board.rank from board where board.user_id = v_uid
  )
  select jsonb_build_object(
    'week_start', v_week,
    'total_ranked', (select count(*) from board),

    'top', (
      select coalesce(jsonb_agg(to_jsonb(t) order by t.rank), '[]'::jsonb)
      from (select * from board order by board.rank limit v_limit) t
    ),

    -- The caller's own row, whether or not it fits in the slice above.
    'me', (
      select to_jsonb(t)
      from (select * from board where board.user_id = v_uid) t
    ),

    -- The five either side, so somebody outside the top still sees who they are chasing.
    -- Rows already inside `top` are left out rather than sent twice.
    'neighbours', (
      select coalesce(jsonb_agg(to_jsonb(t) order by t.rank), '[]'::jsonb)
      from (
        select b.*
        from board b, mine m
        where b.rank between m.rank - 5 and m.rank + 5
          and b.rank > v_limit
        order by b.rank
      ) t
    ),

    -- Why somebody is absent matters: "set a name", "you hid yourself" and "guests are not
    -- ranked" are three different problems with three different fixes, and none of them is
    -- "you have no XP yet". The screen says which one applies.
    'eligible', coalesce(v_has_name and not v_hidden and not v_guest, false),
    'has_display_name', coalesce(v_has_name, false),
    'hidden', coalesce(v_hidden, false),
    'is_guest', coalesce(v_guest, false)
  )
  into v_result;

  return v_result;
end;
$$;

comment on function public.get_leaderboard(integer) is
  'The weekly ranking: the top rows, the caller''s position and their neighbours. Never '
  'exposes an email address or an auth identifier (SPEC §26).';

-- ---------------------------------------------------------------------------------------
-- 4. Reporting (SPEC §26, §49)
-- ---------------------------------------------------------------------------------------

/**
 * Reports a display name for moderation.
 *
 * An RPC rather than a direct insert, because the reporter must not be able to choose their
 * own `reporter_id`, and because a report is only meaningful against somebody who is actually
 * visible on the leaderboard — otherwise this becomes a way to probe whether an arbitrary
 * user id exists.
 *
 * Reports are write-only for clients: `reports` has an insert policy and no read policy at
 * all, so nobody can enumerate who has been reported, or discover that they have been.
 * Moderation happens in Supabase Studio (SPEC §49).
 */
create or replace function public.report_user(
  p_reported_user_id uuid,
  p_reason text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if p_reported_user_id is null or p_reported_user_id = v_uid then
    raise exception 'invalid report target' using errcode = '22023';
  end if;

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'a reason is required' using errcode = '22023';
  end if;

  if char_length(coalesce(v_note, '')) > 500 then
    raise exception 'note too long' using errcode = '22023';
  end if;

  -- Deliberately the same error a genuinely unknown id produces, so this cannot be used to
  -- tell "hidden user" apart from "no such user".
  if not public.leaderboard_eligible(p_reported_user_id) then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  -- One open report per reporter per target. A second one tells moderation nothing new and
  -- would let one person flood the queue.
  if exists (
    select 1 from public.reports r
    where r.reporter_id = v_uid
      and r.reported_user_id = p_reported_user_id
      and r.status = 'open'
  ) then
    return;
  end if;

  insert into public.reports (reporter_id, reported_user_id, reason, note)
  values (v_uid, p_reported_user_id, btrim(p_reason), v_note);
end;
$$;

comment on function public.report_user(uuid, text, text) is
  'Reports a display name for moderation. Write-only: no client can read the queue (SPEC §26).';

-- ---------------------------------------------------------------------------------------
-- 5. Grants (SPEC §40 — default deny, then hand back exactly what the app calls)
-- ---------------------------------------------------------------------------------------

revoke all on function public.display_name_problem(text) from public, anon, authenticated;
revoke all on function public.validate_display_name() from public, anon, authenticated;
revoke all on function public.leaderboard_eligible(uuid) from public, anon, authenticated;
revoke all on function public.leaderboard_xp_today(uuid) from public, anon, authenticated;
revoke all on function public.set_display_name(text) from public, anon, authenticated;
revoke all on function public.get_leaderboard(integer) from public, anon, authenticated;
revoke all on function public.report_user(uuid, text, text) from public, anon, authenticated;

grant execute on function public.set_display_name(text) to authenticated;
grant execute on function public.get_leaderboard(integer) to authenticated;
grant execute on function public.report_user(uuid, text, text) to authenticated;

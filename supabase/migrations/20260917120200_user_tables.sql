-- CodeSprint — per-user state (SPEC §39).
--
-- The client can READ its own rows and writes NONE of them. Every mutation happens inside a
-- SECURITY DEFINER RPC (SPEC §40, §59.26). That is what makes gameplay server-authoritative
-- rather than merely server-validated.

-- ---------------------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_key text not null default 'default',
  birth_year integer,
  locale text not null default 'en',
  -- IANA timezone, validated against pg_timezone_names by update_profile (SPEC §21).
  timezone text not null default 'UTC',
  experience_level text,
  motivation text,
  daily_goal_minutes integer not null default 5,
  reminder_time time,
  onboarding_completed_at timestamptz,
  leaderboard_hidden boolean not null default false,
  analytics_consent boolean not null default false,
  ads_consent_status text not null default 'unknown',
  -- Mirror of auth.users.is_anonymous, kept so RLS and RPCs can exclude guests without
  -- reaching into the auth schema on every query (SPEC §26: guests are not ranked).
  is_anonymous boolean not null default false,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length
    check (display_name is null or char_length(display_name) between 3 and 20),
  constraint profiles_birth_year_sane
    check (birth_year is null or birth_year between 1900 and 2100),
  constraint profiles_daily_goal_valid
    check (daily_goal_minutes in (5, 10, 15))
);

-- Case-insensitive uniqueness: "Ada" and "ada" must not both exist (SPEC §26).
create unique index profiles_display_name_unique_idx
  on public.profiles (lower(display_name))
  where display_name is not null;

create index profiles_last_seen_idx on public.profiles (last_seen_at)
  where is_anonymous;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------------------
-- user_stats
-- ---------------------------------------------------------------------------------------

create table public.user_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Denormalised running total of xp_events. The ledger is the source of truth; this exists
  -- so Home does not aggregate the whole ledger on every open (SPEC §45).
  xp_total integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_qualifying_date date,
  lives integer not null default 5,
  lives_updated_at timestamptz not null default now(),
  lessons_completed integer not null default 0,
  questions_answered integer not null default 0,
  questions_correct integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_stats_non_negative check (
    xp_total >= 0 and current_streak >= 0 and longest_streak >= 0 and lives >= 0
  )
);

create trigger user_stats_set_updated_at
  before update on public.user_stats
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------------------
-- xp_events — the append-only XP ledger (SPEC §19, decision §0.1.2)
-- ---------------------------------------------------------------------------------------
--
-- Every XP award in the product flows through this table. The UNIQUE constraint on
-- (user_id, source_type, source_id) is what makes a duplicate submission a no-op by
-- construction rather than by client discipline: replaying a request hits the constraint
-- and awards nothing.

create table public.xp_events (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- e.g. 'question', 'lesson', 'challenge', 'exam', 'achievement', 'rewarded_ad'
  source_type text not null,
  -- Stable identity of the rewarded thing, scoped by source_type.
  source_id text not null,
  amount integer not null,
  -- Rewarded-ad XP must not inflate the leaderboard (SPEC §19).
  counts_for_leaderboard boolean not null default true,
  week_start date not null default public.iso_week_start(),
  created_at timestamptz not null default now(),
  constraint xp_events_amount_positive check (amount > 0),
  constraint xp_events_unique_reward unique (user_id, source_type, source_id)
);

create index xp_events_user_created_idx on public.xp_events (user_id, created_at desc);
create index xp_events_week_idx on public.xp_events (week_start, user_id);

comment on table public.xp_events is
  'Append-only XP ledger. UNIQUE (user_id, source_type, source_id) makes duplicate awards '
  'impossible; the client never writes here.';

-- ---------------------------------------------------------------------------------------
-- attempts and progress
-- ---------------------------------------------------------------------------------------

create table public.user_question_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  context public.answer_context not null,
  is_correct boolean not null,
  attempt_no integer not null default 1,
  submitted_answer jsonb,
  created_at timestamptz not null default now(),
  constraint user_question_attempts_attempt_no_positive check (attempt_no > 0)
);

create index user_question_attempts_user_question_idx
  on public.user_question_attempts (user_id, question_id);
-- Drives "review mistakes" (SPEC §23).
create index user_question_attempts_user_wrong_idx
  on public.user_question_attempts (user_id, created_at desc)
  where not is_correct;

create table public.user_lesson_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  status public.lesson_progress_status not null default 'in_progress',
  questions_correct integer not null default 0,
  questions_total integer not null default 0,
  -- Every question right on the first attempt — drives the Perfect Lesson achievement.
  is_perfect boolean not null default false,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index user_lesson_progress_completed_idx
  on public.user_lesson_progress (user_id, completed_at desc)
  where status = 'completed';

create trigger user_lesson_progress_set_updated_at
  before update on public.user_lesson_progress
  for each row execute function public.set_updated_at();

-- One row per user per LOCAL date (SPEC §21). Streaks are computed lazily from this on
-- read, so there is no nightly job to run or to go wrong.
create table public.user_daily_activity (
  user_id uuid not null references auth.users (id) on delete cascade,
  local_date date not null,
  lessons_completed integer not null default 0,
  questions_answered integer not null default 0,
  xp_earned integer not null default 0,
  qualified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, local_date)
);

create trigger user_daily_activity_set_updated_at
  before update on public.user_daily_activity
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------------------
-- daily challenge (SPEC §24)
-- ---------------------------------------------------------------------------------------

-- Optional schedule. When no row exists for a date the server picks deterministically from
-- the eligible pool, so there is always a challenge.
create table public.daily_challenges (
  challenge_date date primary key,
  question_ids uuid[] not null,
  bonus_xp integer not null default 25,
  created_at timestamptz not null default now()
);

create table public.user_daily_challenge_claims (
  user_id uuid not null references auth.users (id) on delete cascade,
  local_date date not null,
  xp_awarded integer not null default 0,
  question_ids uuid[] not null default '{}',
  completed_at timestamptz not null default now(),
  -- One reward per user per local date (SPEC §24).
  primary key (user_id, local_date)
);

-- ---------------------------------------------------------------------------------------
-- achievements (SPEC §25)
-- ---------------------------------------------------------------------------------------

create table public.achievements (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  name jsonb not null,
  description jsonb not null,
  icon_key text not null,
  -- Data-driven rule, e.g. {"type":"streak_days","gte":7}. Adding an achievement that uses
  -- an existing rule type is a data change only.
  rule jsonb not null,
  xp_reward integer not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint achievements_rule_has_type check (rule ? 'type')
);

create trigger achievements_set_updated_at
  before update on public.achievements
  for each row execute function public.set_updated_at();

create table public.user_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- ---------------------------------------------------------------------------------------
-- leaderboard (SPEC §26)
-- ---------------------------------------------------------------------------------------
--
-- Updated in the same transaction as the XP event. A new week is a new key, so there is no
-- reset job — the cheapest possible design for a weekly board.

create table public.leaderboard_weekly (
  week_start date not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  xp integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (week_start, user_id),
  constraint leaderboard_weekly_xp_non_negative check (xp >= 0)
);

create index leaderboard_weekly_rank_idx on public.leaderboard_weekly (week_start, xp desc);

-- ---------------------------------------------------------------------------------------
-- exam attempts (SPEC §27)
-- ---------------------------------------------------------------------------------------

create table public.exam_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exam_id uuid not null references public.exams (id) on delete cascade,
  -- Chosen server-side at start_exam and frozen, so the set cannot be reshuffled for a
  -- second bite at the same attempt.
  question_ids uuid[] not null,
  answers jsonb not null default '{}'::jsonb,
  score_pct numeric(5, 2),
  passed boolean,
  skill_breakdown jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create index exam_attempts_user_idx on public.exam_attempts (user_id, started_at desc);
create index exam_attempts_open_idx on public.exam_attempts (user_id, exam_id)
  where submitted_at is null;

-- ---------------------------------------------------------------------------------------
-- entitlements and billing (SPEC §31)
-- ---------------------------------------------------------------------------------------
--
-- Written ONLY by Edge Functions holding the service role. Never by the app, and never from
-- a client flag — this table is the single source of truth for paid access.

create table public.user_entitlements (
  user_id uuid not null references auth.users (id) on delete cascade,
  entitlement public.entitlement_id not null,
  is_active boolean not null default false,
  expires_at timestamptz,
  product_id text,
  store text,
  updated_at timestamptz not null default now(),
  primary key (user_id, entitlement)
);

create trigger user_entitlements_set_updated_at
  before update on public.user_entitlements
  for each row execute function public.set_updated_at();

-- Webhook idempotency log: the RevenueCat event id is the primary key, so replaying a
-- delivery is a no-op (SPEC §31).
create table public.billing_events (
  event_id text primary key,
  user_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index billing_events_user_idx on public.billing_events (user_id, received_at desc);

-- ---------------------------------------------------------------------------------------
-- rewarded ads and moderation
-- ---------------------------------------------------------------------------------------

create table public.rewarded_ad_grants (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  reward_type text not null,
  local_date date not null,
  granted_at timestamptz not null default now()
);

-- Supports the per-day cap enforced server-side (SPEC §30, §42).
create index rewarded_ad_grants_daily_idx
  on public.rewarded_ad_grants (user_id, local_date, reward_type);

create table public.reports (
  id uuid primary key default extensions.gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reported_user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null,
  note text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint reports_no_self_report check (reporter_id <> reported_user_id),
  constraint reports_note_length check (note is null or char_length(note) <= 500)
);

create index reports_status_idx on public.reports (status, created_at desc);

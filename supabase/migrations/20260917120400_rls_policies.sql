-- CodeSprint — Row Level Security (SPEC §40).
--
-- TWO independent layers, deliberately:
--
--   1. GRANTS.  Supabase's default privileges hand anon/authenticated full DML on new public
--      tables. We revoke that wholesale and grant back only the exact reads the client needs.
--      A policy mistake alone then cannot produce a write.
--   2. POLICIES. RLS on every table, restricting reads to the caller's own rows.
--
-- Writes to gameplay tables happen only inside SECURITY DEFINER functions, which bypass RLS
-- by design. That is the whole point: the client physically cannot write XP, progress,
-- lives or attempts (SPEC §59.26).

-- ---------------------------------------------------------------------------------------
-- Layer 1 — strip default privileges
-- ---------------------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Future tables created by later migrations inherit no client privileges either; each
-- migration grants what it needs explicitly.
alter default privileges in schema public
  revoke all on tables from anon, authenticated;

-- ---------------------------------------------------------------------------------------
-- Layer 2 — enable RLS everywhere (SPEC §39: "RLS enabled on EVERY table")
-- ---------------------------------------------------------------------------------------

alter table public.courses                      enable row level security;
alter table public.modules                      enable row level security;
alter table public.lessons                      enable row level security;
alter table public.lesson_contents              enable row level security;
alter table public.questions                    enable row level security;
alter table public.question_answer_keys         enable row level security;
alter table public.exams                        enable row level security;
alter table public.profiles                     enable row level security;
alter table public.user_stats                   enable row level security;
alter table public.xp_events                    enable row level security;
alter table public.user_question_attempts       enable row level security;
alter table public.user_lesson_progress         enable row level security;
alter table public.user_daily_activity          enable row level security;
alter table public.daily_challenges             enable row level security;
alter table public.user_daily_challenge_claims  enable row level security;
alter table public.achievements                 enable row level security;
alter table public.user_achievements            enable row level security;
alter table public.leaderboard_weekly           enable row level security;
alter table public.exam_attempts                enable row level security;
alter table public.user_entitlements            enable row level security;
alter table public.billing_events               enable row level security;
alter table public.rewarded_ad_grants           enable row level security;
alter table public.reports                      enable row level security;
alter table public.app_config                   enable row level security;

-- Belt and braces: the table owner would otherwise bypass its own policies.
alter table public.question_answer_keys         force row level security;
alter table public.billing_events               force row level security;

-- ---------------------------------------------------------------------------------------
-- Public content catalogue — readable metadata, active rows only
-- ---------------------------------------------------------------------------------------

grant select on public.courses, public.modules, public.lessons, public.exams,
                public.achievements to authenticated;

create policy courses_read_active on public.courses
  for select to authenticated using (is_active);

create policy modules_read_active on public.modules
  for select to authenticated using (is_active);

create policy lessons_read_active on public.lessons
  for select to authenticated using (is_active);

create policy exams_read_active on public.exams
  for select to authenticated using (is_active);

-- The achievement catalogue is public so the Profile screen can show locked ones too.
create policy achievements_read_active on public.achievements
  for select to authenticated using (is_active);

-- ---------------------------------------------------------------------------------------
-- Lesson bodies, questions and answer keys — RPC only
-- ---------------------------------------------------------------------------------------
--
-- No grants and no policies. `lesson_contents` and `questions` are entitlement-gated and
-- reachable only through get_lesson / practice / exam RPCs (SPEC §40). Reading them
-- directly would hand a free user the whole premium course.
--
-- `question_answer_keys` additionally has FORCE ROW LEVEL SECURITY and must NEVER receive a
-- policy. If a future migration adds one, the pgTAP suite fails.

-- `daily_challenges` is a schedule, not user content: exposing it early would leak
-- tomorrow's challenge. Served through the daily-challenge RPC instead.

-- ---------------------------------------------------------------------------------------
-- Own-row reads. Note there is deliberately NO insert/update/delete policy anywhere below.
-- ---------------------------------------------------------------------------------------

grant select on public.profiles, public.user_stats, public.xp_events,
                public.user_question_attempts, public.user_lesson_progress,
                public.user_daily_activity, public.user_daily_challenge_claims,
                public.user_achievements, public.leaderboard_weekly,
                public.exam_attempts, public.user_entitlements,
                public.rewarded_ad_grants to authenticated;

create policy profiles_read_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy user_stats_read_own on public.user_stats
  for select to authenticated using (user_id = (select auth.uid()));

create policy xp_events_read_own on public.xp_events
  for select to authenticated using (user_id = (select auth.uid()));

create policy user_question_attempts_read_own on public.user_question_attempts
  for select to authenticated using (user_id = (select auth.uid()));

create policy user_lesson_progress_read_own on public.user_lesson_progress
  for select to authenticated using (user_id = (select auth.uid()));

create policy user_daily_activity_read_own on public.user_daily_activity
  for select to authenticated using (user_id = (select auth.uid()));

create policy user_daily_challenge_claims_read_own on public.user_daily_challenge_claims
  for select to authenticated using (user_id = (select auth.uid()));

create policy user_achievements_read_own on public.user_achievements
  for select to authenticated using (user_id = (select auth.uid()));

create policy exam_attempts_read_own on public.exam_attempts
  for select to authenticated using (user_id = (select auth.uid()));

create policy user_entitlements_read_own on public.user_entitlements
  for select to authenticated using (user_id = (select auth.uid()));

create policy rewarded_ad_grants_read_own on public.rewarded_ad_grants
  for select to authenticated using (user_id = (select auth.uid()));

-- Only the caller's own leaderboard row. The ranking itself, with other users' display
-- names, comes from get_leaderboard() — which filters out guests and hidden users
-- (SPEC §26) and never exposes an email or auth identifier.
create policy leaderboard_weekly_read_own on public.leaderboard_weekly
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------
-- Billing tables — Edge Functions only
-- ---------------------------------------------------------------------------------------
--
-- `user_entitlements` is readable above so the UI can reflect state, but nothing client-side
-- may write it. `billing_events` is not readable at all: it holds raw webhook payloads.

-- ---------------------------------------------------------------------------------------
-- reports — insert only, never read back (SPEC §40)
-- ---------------------------------------------------------------------------------------

grant insert on public.reports to authenticated;

create policy reports_insert_own on public.reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------
-- app_config — public keys readable, including before sign-in
-- ---------------------------------------------------------------------------------------
--
-- Readable by `anon` as well: the force-update check and first-launch flags must work
-- before the guest session exists. Only rows flagged is_public are ever visible.

grant select on public.app_config to anon, authenticated;

create policy app_config_read_public on public.app_config
  for select to anon, authenticated using (is_public);

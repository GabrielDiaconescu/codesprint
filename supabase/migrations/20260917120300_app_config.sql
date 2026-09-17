-- CodeSprint — remote config and feature flags (SPEC §50).
--
-- One row per key. `is_public` decides what the app may read; anything operational stays
-- private. The client fetches this once per app start and falls back to values bundled in
-- src/services/config/defaults.ts when the fetch fails, so the app is never blocked on the
-- network for its own feature flags.

create table public.app_config (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default true,
  description text,
  updated_at timestamptz not null default now()
);

create trigger app_config_set_updated_at
  before update on public.app_config
  for each row execute function public.set_updated_at();

comment on table public.app_config is
  'Feature flags and tunable numbers. Public keys are readable by any authenticated client; '
  'writes are admin-only through Supabase Studio (SPEC §49).';

-- ---------------------------------------------------------------------------------------
-- Defaults. These mirror src/services/config/defaults.ts; a pgTAP test asserts the flag
-- names match so the two cannot drift apart silently.
-- ---------------------------------------------------------------------------------------

insert into public.app_config (key, value, is_public, description) values
  -- Feature flags (SPEC §50)
  ('ads_enabled', 'true'::jsonb, true, 'Remote kill switch for all advertising.'),
  ('subscriptions_enabled', 'true'::jsonb, true, 'Master switch for billing.'),
  ('paywall_enabled', 'true'::jsonb, true, 'Whether upgrade prompts may be shown.'),
  ('leaderboard_enabled', 'true'::jsonb, true, 'Hides the Leaderboard tab when false.'),
  ('exams_enabled', 'true'::jsonb, true, 'Master switch for exam mode.'),
  ('daily_challenge_enabled', 'true'::jsonb, true, 'Master switch for the daily challenge.'),
  ('guest_mode_enabled', 'true'::jsonb, true, 'Anonymous sign-in before registration (D1).'),
  ('coding_challenges_enabled', 'false'::jsonb, true,
   'Reserved. Needs sandboxed execution; V2 (SPEC §16).'),
  ('offline_mode_enabled', 'false'::jsonb, true,
   'Reserved. MUST remain false in V1 (SPEC §50).'),

  -- Content boundary (D5)
  ('free_module_count', '6'::jsonb, true,
   'Modules 1..N are free; the rest require the premium entitlement.'),

  -- XP values (SPEC §19)
  ('xp_easy', '5'::jsonb, true, 'Easy question, correct on first attempt.'),
  ('xp_medium', '10'::jsonb, true, 'Medium question, correct on first attempt.'),
  ('xp_hard', '15'::jsonb, true, 'Hard question, correct on first attempt.'),
  ('xp_retry_multiplier', '0.5'::jsonb, true, 'Applied to a correct answer on a retry, floored.'),
  ('xp_lesson_completion', '20'::jsonb, true, 'Lesson completed.'),
  ('xp_module_checkpoint', '30'::jsonb, true, 'Module checkpoint passed.'),
  ('xp_daily_challenge', '25'::jsonb, true, 'Daily challenge completed.'),
  ('xp_practice_correct', '2'::jsonb, true, 'Correct practice answer.'),
  ('xp_practice_daily_cap', '40'::jsonb, true, 'Maximum practice XP per local day.'),
  ('exam_xp_max', '100'::jsonb, true, 'Exam XP at 100%; awarded as improvement over best.'),

  -- Levels (SPEC §20)
  ('level_thresholds',
   '[0,100,250,500,850,1300,1850,2500,3250,4100,5050,6100,7250,8500,9850,11300,12850,14500,16250,18100]'::jsonb,
   true, 'Cumulative XP required for each level, index 0 = level 1.'),

  -- Lives (SPEC §22)
  ('lives_max', '5'::jsonb, true, 'Maximum lives for non-premium users.'),
  ('lives_regen_minutes', '240'::jsonb, true, 'Minutes to regenerate one life, computed lazily.'),
  ('lives_grace_lessons', '3'::jsonb, true, 'Lives are not consumed during the first N lessons.'),
  ('lives_consume_in', '["lesson","practice","challenge"]'::jsonb, true,
   'Contexts where a wrong answer costs a life. Never exams (SPEC §22).'),
  ('rewarded_life_restores_per_day', '3'::jsonb, true, 'Server-enforced daily cap.'),

  -- Streak (SPEC §21)
  ('streak_min_lessons', '1'::jsonb, true, 'Lessons needed for a day to qualify.'),
  ('streak_min_questions', '5'::jsonb, true, 'Questions needed for a day to qualify (either/or).'),

  -- Daily goal mapping (SPEC §11): minutes are never measured, only used as an XP target.
  ('daily_goal_xp', '{"5":30,"10":60,"15":90}'::jsonb, true, 'Daily goal minutes to XP target.'),

  -- Free tier limits (SPEC §5)
  ('free_exam_attempts_per_week', '1'::jsonb, true, 'Sample exam attempts per week.'),
  ('free_daily_exercise_cap', 'null'::jsonb, true,
   'Deliberately null: lives + content boundary + ads are already enough friction.'),
  ('exam_retry_cooldown_hours', '0'::jsonb, true, 'Cooldown between premium exam retries.'),

  -- Ads (SPEC §30)
  ('interstitial_min_minutes_between', '5'::jsonb, true, 'Minimum gap between interstitials.'),
  ('interstitial_max_per_day', '4'::jsonb, true, 'Daily interstitial cap.'),
  ('interstitial_grace_lessons', '3'::jsonb, true, 'No interstitials during the first N lessons.'),
  ('paywall_prompt_max_per_day', '1'::jsonb, true, 'Upgrade prompts per day (SPEC §34).'),

  -- Anti-abuse (SPEC §42)
  ('leaderboard_daily_xp_cap', '2000'::jsonb, false, 'Per-day XP that can count for ranking.'),

  -- Release control (SPEC §51)
  ('content_version', '0'::jsonb, true,
   'Bumped by the publish script; part of every content query key so clients refetch.'),
  ('min_supported_app_version', '"0.1.0"'::jsonb, true,
   'Below this the app shows a force-update screen.'),
  ('available_course_ids', '[]'::jsonb, true, 'Courses the app may display.');

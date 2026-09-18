import type { AppConfigValues } from '../types';

/**
 * Bundled configuration defaults (SPEC §50).
 *
 * Used on first launch and whenever the remote fetch fails, so the app is never blocked on
 * the network for its own feature flags. The server copy in `app_config` always wins once
 * it loads. Values mirror the spec defaults.
 */
export const DEFAULT_APP_CONFIG: AppConfigValues = {
  ads_enabled: true,
  subscriptions_enabled: true,
  paywall_enabled: true,
  leaderboard_enabled: true,
  exams_enabled: true,
  daily_challenge_enabled: true,
  guest_mode_enabled: true,
  // SPEC §16: coding challenges are schema-only in V1 (needs sandboxed execution).
  coding_challenges_enabled: false,
  // SPEC §50: reserved, MUST remain false in V1.
  offline_mode_enabled: false,
  // SPEC D5: modules 1-6 free.
  free_module_count: 6,
  lives_max: 5,
  // SPEC D10: minimum age 13; §41 applies privacy defaults below 16.
  min_user_age: 13,
  minor_protection_age: 16,
  // SPEC §20. Extended past the last entry by the level logic, so a very active learner
  // keeps levelling instead of sitting at a permanent maximum.
  level_thresholds: [
    0, 100, 250, 500, 850, 1300, 1850, 2500, 3250, 4100, 5050, 6100, 7250, 8500, 9850, 11300,
    12850, 14500, 16250, 18100,
  ],
  content_version: 0,
  min_supported_app_version: '0.1.0',
};

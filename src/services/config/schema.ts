import { z } from 'zod';

import type { AppConfigValues } from '../types';

import { DEFAULT_APP_CONFIG } from './defaults';

/**
 * Validation for the `get_app_config()` response (SPEC §50).
 *
 * Deliberately FORGIVING per key rather than all-or-nothing: one malformed value must not
 * brick the app on launch. Each key is parsed on its own and falls back to the bundled
 * default when it fails, so a bad config row degrades one flag instead of the whole session.
 *
 * Unknown keys are ignored — the server may ship a flag a older client does not know about,
 * which is exactly how SPEC §51 expects config to evolve.
 */

const KEY_SCHEMAS = {
  ads_enabled: z.boolean(),
  subscriptions_enabled: z.boolean(),
  paywall_enabled: z.boolean(),
  leaderboard_enabled: z.boolean(),
  exams_enabled: z.boolean(),
  daily_challenge_enabled: z.boolean(),
  guest_mode_enabled: z.boolean(),
  coding_challenges_enabled: z.boolean(),
  offline_mode_enabled: z.boolean(),
  free_module_count: z.number().int().nonnegative(),
  lives_max: z.number().int().positive(),
  min_user_age: z.number().int().min(13).max(21),
  minor_protection_age: z.number().int().min(13).max(21),
  level_thresholds: z.array(z.number().int().nonnegative()).min(2),
  content_version: z.number().int().nonnegative(),
  min_supported_app_version: z.string().min(1),
} as const satisfies { [K in keyof AppConfigValues]: z.ZodType<AppConfigValues[K]> };

export interface ParsedConfig {
  values: AppConfigValues;
  /** Keys that failed validation and fell back to a default. Reported to monitoring. */
  invalidKeys: string[];
}

export const parseAppConfig = (raw: unknown): ParsedConfig => {
  const invalidKeys: string[] = [];

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { values: DEFAULT_APP_CONFIG, invalidKeys: ['(response was not an object)'] };
  }

  const source = raw as Record<string, unknown>;
  const values = { ...DEFAULT_APP_CONFIG };

  for (const key of Object.keys(KEY_SCHEMAS) as (keyof AppConfigValues)[]) {
    if (!(key in source)) continue;

    const result = KEY_SCHEMAS[key].safeParse(source[key]);
    if (result.success) {
      // Each schema is bound to its own key's type by the `satisfies` clause above, so the
      // assignment is sound; TypeScript cannot follow that through the index type alone.
      (values as Record<string, unknown>)[key] = result.data;
    } else {
      invalidKeys.push(key);
    }
  }

  // SPEC §50: offline mode is reserved and must stay false in V1, whatever the server says.
  // A flag flipped by mistake would enable a code path that does not exist yet.
  values.offline_mode_enabled = false;

  return { values, invalidKeys };
};

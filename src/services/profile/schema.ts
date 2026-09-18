import { z } from 'zod';

import { DAILY_GOAL_MINUTES, EXPERIENCE_LEVELS, MOTIVATIONS, type UserProfile } from '../types';

/**
 * The profile row, validated on the way in (SPEC §6: Zod for RPC responses).
 *
 * The client reads `profiles` directly — RLS restricts it to the caller's own row — so this
 * maps the database's snake_case row onto the domain shape and refuses anything malformed.
 *
 * Unknown values for the onboarding answers become `null` rather than failing the whole
 * parse. They drive nothing but a sentence of personalisation, and a row written by a future
 * version of the app must not lock an older client out of its own profile.
 */

const nullableEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .nullable()
    .transform((value) => (value !== null && values.includes(value) ? (value as T[number]) : null));

const ADS_CONSENT = ['unknown', 'required', 'obtained', 'denied', 'restricted'] as const;

const profileRowSchema = z.object({
  id: z.string(),
  display_name: z.string().nullable(),
  avatar_key: z.string(),
  birth_year: z.number().int().nullable(),
  locale: z.string(),
  timezone: z.string(),
  experience_level: nullableEnum(EXPERIENCE_LEVELS),
  motivation: nullableEnum(MOTIVATIONS),
  daily_goal_minutes: z.number().int(),
  // Postgres `time` comes back as 'HH:MM:SS'; the app only ever needs hours and minutes.
  reminder_time: z.string().nullable(),
  onboarding_completed_at: z.string().nullable(),
  leaderboard_hidden: z.boolean(),
  analytics_consent: z.boolean(),
  ads_consent_status: z.string(),
  is_anonymous: z.boolean(),
});

export type ProfileRow = z.input<typeof profileRowSchema>;

const toHoursAndMinutes = (value: string | null): string | null =>
  value === null ? null : value.slice(0, 5);

export const parseProfile = (row: unknown): UserProfile => {
  const parsed = profileRowSchema.parse(row);

  return {
    id: parsed.id,
    displayName: parsed.display_name,
    avatarKey: parsed.avatar_key,
    birthYear: parsed.birth_year,
    locale: parsed.locale,
    timezone: parsed.timezone,
    experienceLevel: parsed.experience_level,
    motivation: parsed.motivation,
    dailyGoalMinutes: parsed.daily_goal_minutes,
    reminderTime: toHoursAndMinutes(parsed.reminder_time),
    onboardingCompleted: parsed.onboarding_completed_at !== null,
    leaderboardHidden: parsed.leaderboard_hidden,
    analyticsConsent: parsed.analytics_consent,
    adsConsentStatus: (ADS_CONSENT as readonly string[]).includes(parsed.ads_consent_status)
      ? (parsed.ads_consent_status as UserProfile['adsConsentStatus'])
      : 'unknown',
    isAnonymous: parsed.is_anonymous,
  };
};

/**
 * Onboarding answers, validated before they are sent.
 *
 * The server is the authority — it re-checks the age and forces the minor defaults — but
 * catching a bad value here turns a confusing RPC error into a field the user can fix.
 */
export const onboardingAnswersSchema = z.object({
  birthYear: z.number().int().min(1900).max(2100),
  experienceLevel: z.enum(EXPERIENCE_LEVELS),
  motivation: z.enum(MOTIVATIONS),
  dailyGoalMinutes: z.union([z.literal(5), z.literal(10), z.literal(15)]),
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'reminder time must be HH:MM')
    .nullable(),
  analyticsConsent: z.boolean(),
});

/** Exported so the UI can offer exactly the options the schema accepts. */
export const DAILY_GOAL_OPTIONS = DAILY_GOAL_MINUTES;

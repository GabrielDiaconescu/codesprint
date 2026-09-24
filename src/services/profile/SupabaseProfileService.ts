import { getSupabaseClient } from '../supabase/client';
import type { OnboardingAnswers, ProfilePatch, ProfileService, UserProfile } from '../types';

import { onboardingAnswersSchema, parseProfile } from './schema';

/**
 * Profile reads and writes (SPEC §11, §29, §40).
 *
 * Reads go straight to the table — RLS restricts `profiles` to the caller's own row, so there
 * is nothing a client could ask for that it should not see. Writes go exclusively through
 * `update_profile`, because `profiles` has no UPDATE policy at all: the whitelist of writable
 * columns, and the minor protections, live in one place in the database rather than being
 * re-implemented per screen.
 */

const SELECT_COLUMNS =
  'id, display_name, avatar_key, birth_year, locale, timezone, experience_level, motivation, ' +
  'daily_goal_minutes, reminder_time, onboarding_completed_at, leaderboard_hidden, ' +
  'analytics_consent, ads_consent_status, is_anonymous';

/**
 * The patch shape `update_profile` accepts. Primitives only — every writable column is a
 * scalar, and the RPC argument is typed as Json.
 */
type ProfilePatchPayload = Record<string, string | number | boolean | null>;

/** `update_profile` returns the full row, so every write refreshes the cache for free. */
const callUpdateProfile = async (patch: ProfilePatchPayload): Promise<UserProfile> => {
  const { data, error } = await getSupabaseClient().rpc('update_profile', { p_patch: patch });
  if (error) throw error;
  return parseProfile(data);
};

export const SupabaseProfileService: ProfileService = {
  serviceName: 'SupabaseProfileService',
  isNoop: false,

  async get() {
    const { data, error } = await getSupabaseClient()
      .from('profiles')
      .select(SELECT_COLUMNS)
      // The row is created by a trigger when the auth user is created, but a request that
      // races that trigger must return "no profile yet" rather than throwing.
      .maybeSingle();

    if (error) throw error;
    return data === null ? null : parseProfile(data);
  },

  async update(patch: ProfilePatch) {
    // Only keys the caller actually set are sent: `update_profile` distinguishes an absent
    // key from an explicit null, and sending undefined would clear a value by accident.
    const payload: ProfilePatchPayload = {};
    if (patch.avatarKey !== undefined) payload.avatar_key = patch.avatarKey;
    if (patch.locale !== undefined) payload.locale = patch.locale;
    if (patch.timezone !== undefined) payload.timezone = patch.timezone;
    if (patch.reminderTime !== undefined) payload.reminder_time = patch.reminderTime ?? '';
    if (patch.dailyGoalMinutes !== undefined) payload.daily_goal_minutes = patch.dailyGoalMinutes;
    if (patch.leaderboardHidden !== undefined) payload.leaderboard_hidden = patch.leaderboardHidden;
    if (patch.analyticsConsent !== undefined) payload.analytics_consent = patch.analyticsConsent;

    return callUpdateProfile(payload);
  },

  async completeOnboarding(answers: OnboardingAnswers) {
    const valid = onboardingAnswersSchema.parse(answers);

    // One round trip for the whole flow. Writing each step as it is answered would leave a
    // half-filled profile behind whenever someone abandons onboarding.
    return callUpdateProfile({
      birth_year: valid.birthYear,
      experience_level: valid.experienceLevel,
      motivation: valid.motivation,
      daily_goal_minutes: valid.dailyGoalMinutes,
      reminder_time: valid.reminderTime ?? '',
      analytics_consent: valid.analyticsConsent,
      onboarding_completed: true,
    });
  },

  async rejectUnderageAccount() {
    const { error } = await getSupabaseClient().rpc('reject_underage_account');
    if (error) throw error;
  },

  async exportMyData() {
    const { data, error } = await getSupabaseClient().rpc('export_my_data');
    if (error) throw error;
    return data;
  },

  async syncSession(timezone: string) {
    const { data, error } = await getSupabaseClient().rpc('sync_session', {
      p_timezone: timezone,
    });
    if (error) throw error;
    return parseProfile(data);
  },
};

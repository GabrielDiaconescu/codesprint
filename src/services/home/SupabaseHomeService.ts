import { getSupabaseClient } from '../supabase/client';
import { LessonUnavailableError, type HomeService } from '../types';

import { challengeClaim, dailyChallenge, homeSummary, practiceSet } from './schema';

/**
 * Home, Practice and the Daily Challenge (SPEC §13, §23, §24).
 *
 * Home is one RPC on purpose. It is the most-opened screen in the product, and five parallel
 * requests on a cold mobile connection is five chances to show a spinner where an answer
 * should be (SPEC §45).
 */
export const SupabaseHomeService: HomeService = {
  serviceName: 'SupabaseHomeService',
  isNoop: false,

  async getHome(locale) {
    const { data, error } = await getSupabaseClient().rpc('get_home_summary', {
      p_locale: locale,
    });
    if (error) throw error;
    return homeSummary.parse(data);
  },

  async getPracticeSet(mode, size, locale) {
    const { data, error } = await getSupabaseClient().rpc('get_practice_set', {
      p_mode: mode,
      p_size: size,
      p_locale: locale,
    });
    // 42501 here means a free learner asked for a hard set — the paywall, not a failure.
    if (error)
      throw new LessonUnavailableError(error.code === '42501' ? 'requires-premium' : 'unknown');
    return practiceSet.parse(data);
  },

  async getDailyChallenge(locale) {
    const { data, error } = await getSupabaseClient().rpc('get_daily_challenge', {
      p_locale: locale,
    });
    if (error) throw error;
    return dailyChallenge.parse(data);
  },

  async claimDailyChallenge() {
    const { data, error } = await getSupabaseClient().rpc('claim_daily_challenge');
    if (error) throw error;
    return challengeClaim.parse(data);
  },
};

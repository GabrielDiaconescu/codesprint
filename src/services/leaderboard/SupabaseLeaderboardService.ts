import { getSupabaseClient } from '../supabase/client';
import type { LeaderboardService } from '../types';

import { DisplayNameRejected, toDisplayNameProblem } from './errors';
import { displayNameResult, leaderboard } from './schema';

/**
 * The weekly leaderboard, display names and reports (SPEC §26).
 *
 * Every call is an RPC. There is no client query against `leaderboard_weekly` or `profiles`
 * for another user, and there could not be: RLS limits both to the caller's own row, and the
 * ranking is assembled by a security-definer function that decides what is safe to send.
 */
export const SupabaseLeaderboardService: LeaderboardService = {
  serviceName: 'SupabaseLeaderboardService',
  isNoop: false,

  async get(limit) {
    const { data, error } = await getSupabaseClient().rpc('get_leaderboard', {
      p_limit: limit ?? 50,
    });
    if (error) throw error;
    return leaderboard.parse(data);
  },

  async setDisplayName(name) {
    const { data, error } = await getSupabaseClient().rpc('set_display_name', { p_name: name });
    if (error) throw new DisplayNameRejected(toDisplayNameProblem(error), error);
    return displayNameResult.parse(data).display_name;
  },

  async report(userId, reason, note) {
    const { error } = await getSupabaseClient().rpc('report_user', {
      p_reported_user_id: userId,
      p_reason: reason,
      // Omitted rather than sent as null: the RPC defaults it, and a note is optional.
      ...(note ? { p_note: note } : {}),
    });
    if (error) throw error;
  },
};

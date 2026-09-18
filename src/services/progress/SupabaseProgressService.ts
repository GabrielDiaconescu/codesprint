import { getSupabaseClient } from '../supabase/client';
import { LessonUnavailableError, type ProgressService } from '../types';

import { lessonCompletion, progressSummary, userStats } from './schema';

/**
 * XP, lesson completion and the progress summary (SPEC §19, §28).
 *
 * Everything here is a SECURITY DEFINER RPC. `user_stats`, `xp_events` and
 * `user_lesson_progress` are readable by their owner under RLS, but no client writes any of
 * them — gameplay state is server-authoritative (SPEC §40).
 */

const toReason = (error: { code?: string | null } | null) => {
  if (error?.code === '42501') return 'requires-premium' as const;
  if (error?.code === 'P0002') return 'not-found' as const;
  return 'unknown' as const;
};

export const SupabaseProgressService: ProgressService = {
  serviceName: 'SupabaseProgressService',
  isNoop: false,

  async getStats() {
    const { data, error } = await getSupabaseClient().rpc('get_user_stats');
    if (error) throw error;
    return userStats.parse(data);
  },

  async getSummary(locale) {
    const { data, error } = await getSupabaseClient().rpc('get_progress_summary', {
      p_locale: locale,
    });
    if (error) throw error;
    return progressSummary.parse(data);
  },

  async completeLesson(lessonId) {
    const { data, error } = await getSupabaseClient().rpc('complete_lesson', {
      p_lesson_id: lessonId,
    });
    if (error) throw new LessonUnavailableError(toReason(error));
    return lessonCompletion.parse(data);
  },
};

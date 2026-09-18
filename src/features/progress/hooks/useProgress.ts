import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { queryKeys } from '@/lib/queryClient';
import { services, type LessonCompletion, type ProgressSummary, type UserStats } from '@/services';
import { useSessionStore } from '@/store/sessionStore';

/**
 * XP and the progress screen (SPEC §19, §28).
 *
 * Keyed by user id, so signing into another account cannot show the previous one's XP even
 * for a frame. `staleTime` is short: XP changes as the learner answers, and a stale total on
 * Home after finishing a lesson reads as a bug.
 */
export const useUserStats = () => {
  const userId = useSessionStore((state) => state.userId);

  return useQuery<UserStats>({
    queryKey: queryKeys.user.stats(userId ?? 'none'),
    queryFn: () => services.progress.getStats(),
    enabled: userId !== null,
    staleTime: 30_000,
  });
};

export const useProgressSummary = () => {
  const { i18n } = useTranslation();
  const userId = useSessionStore((state) => state.userId);

  return useQuery<ProgressSummary>({
    queryKey: queryKeys.user.summary(userId ?? 'none', i18n.language),
    queryFn: () => services.progress.getSummary(i18n.language),
    enabled: userId !== null,
    staleTime: 30_000,
  });
};

/**
 * Records a lesson as complete (SPEC §19).
 *
 * Retries once, unlike answer submission: this call is idempotent by construction — the
 * ledger refuses a second payment for the same lesson — so a retry after a dropped response
 * can only produce the right answer. Losing the completion because a train went into a
 * tunnel would be worse.
 */
export const useCompleteLesson = () => {
  const queryClient = useQueryClient();
  const userId = useSessionStore((state) => state.userId);

  return useMutation<LessonCompletion, Error, { lessonId: string }>({
    mutationFn: ({ lessonId }) => services.progress.completeLesson(lessonId),
    retry: 1,
    onSuccess: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
  });
};

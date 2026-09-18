import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';
import { services, type Leaderboard, type ReportReason } from '@/services';
import { useSessionStore } from '@/store/sessionStore';

/**
 * The weekly ranking (SPEC §26).
 *
 * A longer `staleTime` than Home: other people's scores are not something the learner acts
 * on, and refetching a fifty-row list every few seconds costs egress for no benefit
 * (SPEC §60). Pull-to-refresh is the deliberate way to get a fresh one.
 */
export const useLeaderboard = (limit = 50) => {
  const userId = useSessionStore((state) => state.userId);

  return useQuery<Leaderboard>({
    queryKey: [...queryKeys.leaderboard(userId ?? 'none'), limit],
    queryFn: () => services.leaderboard.get(limit),
    enabled: userId !== null,
    staleTime: 2 * 60_000,
  });
};

/**
 * Claims a display name.
 *
 * Invalidates the profile as well as the board: the name shows on the Profile screen too, and
 * leaving that stale is the kind of small wrongness that reads as an unreliable app.
 */
export const useSetDisplayName = () => {
  const queryClient = useQueryClient();
  const userId = useSessionStore((state) => state.userId);

  return useMutation<string, Error, string>({
    mutationFn: (name) => services.leaderboard.setDisplayName(name),
    onSuccess: () => {
      if (!userId) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(userId) });
    },
  });
};

/** "Hide me from the leaderboard" (SPEC §26, §29). */
export const useSetLeaderboardVisibility = () => {
  const queryClient = useQueryClient();
  const userId = useSessionStore((state) => state.userId);

  return useMutation<void, Error, boolean>({
    mutationFn: async (hidden) => {
      await services.profile.update({ leaderboardHidden: hidden });
    },
    onSuccess: () => {
      if (!userId) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(userId) });
    },
  });
};

export interface ReportInput {
  userId: string;
  reason: ReportReason;
  note?: string;
}

/**
 * Reports a display name (SPEC §26).
 *
 * Nothing is invalidated afterwards, and nothing can be: the queue is write-only, so a report
 * changes nothing the reporter is able to observe. The UI thanks them and closes.
 */
export const useReportUser = () =>
  useMutation<void, Error, ReportInput>({
    mutationFn: ({ userId, reason, note }) => services.leaderboard.report(userId, reason, note),
  });

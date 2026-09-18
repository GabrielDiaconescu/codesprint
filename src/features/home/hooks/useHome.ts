import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { queryKeys } from '@/lib/queryClient';
import {
  services,
  type ChallengeClaim,
  type DailyChallenge,
  type HomeSummary,
  type PracticeMode,
  type PracticeSet,
} from '@/services';
import { useSessionStore } from '@/store/sessionStore';

/**
 * Home in one round trip (SPEC §13).
 *
 * `staleTime` is short because everything on this screen moves: XP, the streak, lives, the
 * next lesson. Coming back from a lesson to a stale Home reads as a bug.
 */
export const useHome = () => {
  const { i18n } = useTranslation();
  const userId = useSessionStore((state) => state.userId);

  return useQuery<HomeSummary>({
    queryKey: queryKeys.user.home(userId ?? 'none'),
    queryFn: () => services.home.getHome(i18n.language),
    enabled: userId !== null,
    staleTime: 15_000,
  });
};

/**
 * A practice set (SPEC §23).
 *
 * Deliberately NOT cached across opens: the point of practice is a fresh set each time, and a
 * cached one would serve the same ten questions all afternoon.
 */
export const usePracticeSet = (mode: PracticeMode, size = 10, enabled = true) => {
  const { i18n } = useTranslation();
  const userId = useSessionStore((state) => state.userId);

  return useQuery<PracticeSet>({
    queryKey: [...queryKeys.user.practice(userId ?? 'none'), mode, size],
    queryFn: () => services.home.getPracticeSet(mode, size, i18n.language),
    enabled: enabled && userId !== null,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
};

export const useDailyChallenge = () => {
  const { i18n } = useTranslation();
  const userId = useSessionStore((state) => state.userId);

  return useQuery<DailyChallenge>({
    queryKey: queryKeys.user.challenge(userId ?? 'none'),
    queryFn: () => services.home.getDailyChallenge(i18n.language),
    enabled: userId !== null,
    staleTime: 60_000,
  });
};

/**
 * Claims the day's bonus (SPEC §24).
 *
 * Retries once: the claim is idempotent — the primary key on (user, local date) makes a
 * second insert a no-op — so a retry after a dropped response can only produce the right
 * answer, and losing a bonus to a flaky connection would be worse.
 */
export const useClaimChallenge = () => {
  const queryClient = useQueryClient();
  const userId = useSessionStore((state) => state.userId);

  return useMutation<ChallengeClaim, Error, void>({
    mutationFn: () => services.home.claimDailyChallenge(),
    retry: 1,
    onSuccess: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
  });
};

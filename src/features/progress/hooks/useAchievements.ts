import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { queryKeys } from '@/lib/queryClient';
import { services, type AchievementEntry } from '@/services';
import { useSessionStore } from '@/store/sessionStore';

/**
 * The achievement catalogue with this user's unlock state (SPEC §25, §29).
 *
 * Locked achievements come back too, so the screen has something to aim at rather than an
 * empty list for a new learner.
 */
export const useAchievements = () => {
  const { i18n } = useTranslation();
  const userId = useSessionStore((state) => state.userId);

  return useQuery<AchievementEntry[]>({
    queryKey: queryKeys.user.achievements(userId ?? 'none', i18n.language),
    queryFn: () => services.progress.getAchievements(i18n.language),
    enabled: userId !== null,
    staleTime: 60_000,
  });
};

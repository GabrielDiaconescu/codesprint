import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';
import { services, type UserProfile } from '@/services';
import { useSessionStore } from '@/store/sessionStore';

/**
 * The signed-in user's profile (SPEC §0.1.3 — server state, so TanStack Query).
 *
 * Keyed by user id so signing into a different account cannot show the previous one's
 * answers, even for a frame.
 */
export const useProfile = () => {
  const userId = useSessionStore((state) => state.userId);

  return useQuery<UserProfile | null>({
    queryKey: queryKeys.user.profile(userId ?? 'none'),
    queryFn: () => services.profile.get(),
    enabled: userId !== null,
    // The profile changes only when the user changes it, and every write returns the fresh
    // row, so refetching on an interval would be pure noise.
    staleTime: 5 * 60_000,
  });
};

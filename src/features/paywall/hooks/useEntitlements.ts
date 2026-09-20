import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';
import {
  NO_SERVER_ENTITLEMENTS,
  services,
  type ServerEntitlements,
  type StoreProduct,
} from '@/services';
import { useSessionStore } from '@/store/sessionStore';

/**
 * What the server says the learner has paid for (SPEC §31).
 *
 * `initialData` is "nothing", so a screen never has to branch on `undefined` — and the safe
 * default is the un-entitled one. A failure to read entitlements must never accidentally grant
 * access; the server would refuse anyway, but the UI should not promise what the server will
 * then deny.
 */
export const useEntitlements = () => {
  const userId = useSessionStore((state) => state.userId);

  return useQuery<ServerEntitlements>({
    queryKey: queryKeys.entitlements(userId ?? 'none'),
    queryFn: () => services.entitlements.get(),
    enabled: userId !== null,
    initialData: NO_SERVER_ENTITLEMENTS,
    // Without this, TanStack treats `initialData` as having just been fetched and skips the
    // request for the whole `staleTime` — a paying customer would be shown as free for the
    // first minute after every launch. Zero means "this placeholder is already stale": render
    // it now, fetch immediately.
    initialDataUpdatedAt: 0,
    staleTime: 60_000,
  });
};

/**
 * Asks the server to re-check with RevenueCat.
 *
 * Called after a purchase and after a restore. On success everything user-scoped is
 * invalidated, because unlocking Premium changes the Learn list, the exam list, practice, the
 * lives display and the paywall all at once.
 */
export const useRefreshEntitlements = () => {
  const queryClient = useQueryClient();
  const userId = useSessionStore((state) => state.userId);

  return useMutation<ServerEntitlements, Error, void>({
    mutationFn: () => services.entitlements.refresh(),
    retry: 1,
    onSuccess: (entitlements) => {
      if (!userId) return;
      queryClient.setQueryData(queryKeys.entitlements(userId), entitlements);
      void queryClient.invalidateQueries({ queryKey: ['user', userId] });
      void queryClient.invalidateQueries({ queryKey: ['content'] });
    },
  });
};

/**
 * The products on sale, from the store (SPEC §0.1.5, §33).
 *
 * `retry: 1` and a short stale time: offerings are a network call to the store, and a paywall
 * that cannot load them shows an error with a retry rather than any price of its own
 * invention.
 */
export const useOfferings = () =>
  useQuery<StoreProduct[]>({
    queryKey: queryKeys.offerings(),
    queryFn: () => services.billing.getOfferings(),
    retry: 1,
    staleTime: 5 * 60_000,
  });

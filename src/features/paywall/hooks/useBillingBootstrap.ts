import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { queryKeys } from '@/lib/queryClient';
import { services } from '@/services';
import { useSessionStore } from '@/store/sessionStore';

/**
 * The billing SDK's lifecycle (SPEC §12, §31).
 *
 * Three things have to happen, in order, and nothing else in the app does them:
 *
 *   1. `initialize()` once, before any offering or purchase call;
 *   2. `identify(userId)` whenever somebody signs in, so a purchase attaches to their Supabase
 *      id rather than to an anonymous RevenueCat one — which is what lets the webhook find the
 *      account to grant (SPEC §12);
 *   3. `reset()` on sign-out, so the next person on this device is not handed the last one's
 *      subscription.
 *
 * Failures are reported and swallowed. A learner who cannot reach RevenueCat should still be
 * able to open a lesson; what they lose is the paywall, which says so itself. Crashing the app
 * on startup because a store SDK is unhappy would be the wrong trade every time.
 */
export const useBillingBootstrap = (): void => {
  const userId = useSessionStore((state) => state.userId);
  const queryClient = useQueryClient();
  const initialized = useRef(false);
  const identified = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        if (!initialized.current) {
          await services.billing.initialize();
          initialized.current = true;
        }

        if (cancelled) return;

        // Only on a real change. `identify` is a network call, and re-running it on every
        // render of the root layout would be a request per navigation.
        if (userId !== identified.current) {
          if (userId) {
            await services.billing.identify(userId);
          } else if (identified.current !== null) {
            await services.billing.reset();
          }
          identified.current = userId;

          // Who the customer is has changed, so what the store thinks they own has too.
          queryClient.removeQueries({ queryKey: queryKeys.offerings() });
        }
      } catch (error) {
        services.monitoring.captureException(error, { stage: 'billing-bootstrap' });
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [userId, queryClient]);
};

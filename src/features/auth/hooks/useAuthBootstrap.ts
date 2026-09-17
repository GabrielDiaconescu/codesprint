import { useEffect } from 'react';
import { AppState } from 'react-native';

import { services } from '@/services';
import { useSessionStore } from '@/store/sessionStore';

/**
 * Restores the session and keeps it in sync for the lifetime of the app (SPEC §12).
 *
 * Mounted once, by the root layout. It deliberately does NOT create a guest account on
 * launch: an anonymous user is a billable Supabase MAU for 30 days (SPEC §60), so a guest is
 * created only when someone actually taps "continue as guest".
 */
export const useAuthBootstrap = (): void => {
  const setUser = useSessionStore((state) => state.setUser);
  const beginPasswordReset = useSessionStore((state) => state.beginPasswordReset);

  useEffect(() => {
    let active = true;

    // Subscribe BEFORE reading the stored session. The other order has a window in which a
    // token refresh completes between the read and the subscription, and the app would then
    // hold a user object that no longer matches the session until the next change.
    const unsubscribe = services.auth.onChange((user, reason) => {
      if (!active) return;
      if (reason === 'password-recovery') beginPasswordReset();
      setUser(user);
    });

    services.auth
      .getUser()
      .then((user) => {
        if (active) setUser(user);
      })
      .catch(() => {
        // A session that cannot be restored is simply no session. Blocking the app on this
        // would strand the user at a splash screen with no way forward (SPEC §46).
        if (active) setUser(null);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [setUser, beginPasswordReset]);

  useEffect(() => {
    // Token refresh follows foreground state: refreshing in the background burns battery and
    // fails anyway on a sleeping radio, which surfaces as a spurious signed-out state.
    services.auth.setAppActive(AppState.currentState === 'active');

    const subscription = AppState.addEventListener('change', (state) => {
      services.auth.setAppActive(state === 'active');
    });

    return () => subscription.remove();
  }, []);
};

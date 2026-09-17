import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { services } from '@/services';
import { useSessionStore } from '@/store/sessionStore';

/**
 * Tells the server the user is still here (SPEC §12, §21).
 *
 * Two things depend on this and both fail quietly without it:
 *
 *   * `profiles.last_seen_at` is what the nightly purge uses to decide a guest was abandoned.
 *     A guest who opens the app daily but never triggers a heartbeat would be deleted after
 *     thirty days, taking their progress with them.
 *   * `profiles.timezone` is what the server computes local dates from, so streaks are wrong
 *     for anyone who travels until the device reports the change.
 *
 * Fired on sign-in and on every return to the foreground, throttled so that flicking between
 * apps does not produce a request per switch.
 */
const THROTTLE_MS = 5 * 60_000;

const deviceTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    // Hermes ships Intl, but a device with a broken zone database must not break sign-in.
    return 'UTC';
  }
};

export const useSessionHeartbeat = (): void => {
  const userId = useSessionStore((state) => state.userId);
  const lastSentAt = useRef(0);

  useEffect(() => {
    if (userId === null) {
      lastSentAt.current = 0;
      return;
    }

    const send = () => {
      const now = Date.now();
      if (now - lastSentAt.current < THROTTLE_MS) return;
      lastSentAt.current = now;

      // Deliberately fire-and-forget: this is bookkeeping, and a failure must never surface
      // to the user or block a screen (SPEC §46).
      void services.profile.syncSession(deviceTimezone()).catch(() => {});
    };

    send();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') send();
    });

    return () => subscription.remove();
  }, [userId]);
};

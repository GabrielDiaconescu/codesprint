import { useCallback, useEffect, useRef } from 'react';

import { useProfile } from '@/features/profile/hooks/useProfile';
import { services, type AnalyticsEvent, type AnalyticsProperties } from '@/services';
import { useSessionStore } from '@/store/sessionStore';

/**
 * Captures an event exactly once while a screen is mounted.
 *
 * For the "…_viewed" and "…_started" events, where a re-render must not produce a second
 * event and quietly double every funnel denominator.
 */
export const useCaptureOnce = (
  event: AnalyticsEvent,
  properties?: AnalyticsProperties,
  enabled = true,
): void => {
  const fired = useRef(false);

  useEffect(() => {
    if (!enabled || fired.current) return;
    fired.current = true;
    services.analytics.capture(event, properties);
    // Deliberately keyed on `enabled` alone: the properties of a view event are decided when
    // it fires, and a later change to them is not a second view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
};

/**
 * Analytics lifecycle (SPEC §41, §43).
 *
 * Three things, in this order, and nothing else in the app does them:
 *
 *   1. start the SDK;
 *   2. mirror `profiles.analytics_consent` into it — the SERVER is the authority, and it
 *      forces consent to false for a learner under the protection age whatever the client
 *      thinks (SPEC §41);
 *   3. identify with the pseudonymous Supabase id, and reset on sign-out.
 *
 * Monitoring is started here too, because it does not wait for consent and there is no reason
 * to give it its own hook: a crash report is a stack trace, not a behavioural profile.
 */
export const useAnalyticsBootstrap = (): void => {
  const userId = useSessionStore((state) => state.userId);
  const { data: profile } = useProfile();
  const identified = useRef<string | null>(null);

  useEffect(() => {
    void services.monitoring.initialize();
    void services.analytics.initialize();
  }, []);

  useEffect(() => {
    // `analytics_consent` on the profile is the authority. A minor's is forced false
    // server-side, so this cannot be talked out of by the client.
    services.analytics.setConsent(profile?.analyticsConsent === true);
  }, [profile?.analyticsConsent]);

  // Fired once consent is known, not on mount. Capturing before `setConsent` has run would
  // drop it silently, and `app_opened` is the denominator for daily actives (SPEC §43).
  useCaptureOnce('app_opened', undefined, profile?.analyticsConsent === true);

  useEffect(() => {
    if (userId === identified.current) return;

    if (userId) {
      services.analytics.identify(userId);
      services.monitoring.setUser(userId);
    } else if (identified.current !== null) {
      // Sign-out: the next person on this device is not the previous one.
      services.analytics.reset();
      services.monitoring.setUser(null);
    }

    identified.current = userId;
  }, [userId]);
};

/**
 * Captures an event.
 *
 * A hook rather than a direct `services.analytics.capture` call at every site, so that the
 * function identity is stable and a screen can put it in a dependency array without
 * re-registering an effect on every render.
 *
 * Properties are sanitised inside the service (SPEC §43), so a caller cannot leak personal
 * data by being careless here — but the rule is still worth knowing: **enums and counts only**.
 */
export const useCapture = () =>
  useCallback((event: AnalyticsEvent, properties?: AnalyticsProperties) => {
    services.analytics.capture(event, properties);
  }, []);

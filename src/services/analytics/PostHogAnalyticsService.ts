import PostHog from 'posthog-react-native';

import { isSafeDistinctId, sanitizeProperties } from '@/features/analytics/logic/sanitize';
import { getEnv } from '@/lib/env';

import type { AnalyticsService } from '../types';

/**
 * PostHog, EU region (SPEC §41, §43).
 *
 * Two rules govern every method here, and both are checked on **every call** rather than only
 * at startup:
 *
 *   1. **Nothing is captured without consent.** SPEC §41 requires analytics to be opt-in in the
 *      EEA, and `setConsent(false)` has to silence it immediately — not at the next launch.
 *   2. **No personal data leaves the device.** Every property goes through
 *      `sanitizeProperties`, and the distinct id must look like a Supabase user id or it is
 *      refused outright.
 *
 * Without a project key the service simply does nothing. That is not a no-op implementation in
 * the SPEC §7 sense — it is the real integration, inert until configured, and it reports
 * `isNoop: false` because nothing here pretends to work.
 */

let client: PostHog | null = null;
let consentGranted = false;

/** Queued until consent arrives? No. Deliberately dropped — see `capture`. */
const enabled = (): boolean => client !== null && consentGranted;

export const PostHogAnalyticsService: AnalyticsService = {
  serviceName: 'PostHogAnalyticsService',
  isNoop: false,

  async initialize() {
    if (client) return;

    const env = getEnv();
    const apiKey = env.EXPO_PUBLIC_POSTHOG_KEY;
    if (!apiKey) return;

    client = new PostHog(apiKey, {
      // EU data residency (SPEC §41). The default host is US, so this is not optional.
      host: env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
      // Nothing is sent until consent is granted, so there is no point starting a session
      // recording or capturing lifecycle events on our behalf.
      captureAppLifecycleEvents: false,
      disabled: !consentGranted,
    });
  },

  capture(event, properties) {
    // Events raised before consent are DROPPED, not queued. A queue that flushes on consent
    // would send the learner's behaviour from before they agreed to it, which is the thing
    // opt-in exists to prevent (SPEC §41).
    if (!enabled()) return;

    const { safe, dropped } = sanitizeProperties(properties);

    if (__DEV__ && dropped.length > 0) {
      // Loud in development, where it can still be fixed, and silent in production, where a
      // warning would help nobody and the property has already been removed.
      console.warn(
        `[analytics] "${event}" dropped ${dropped
          .map((entry) => `${entry.key} (${entry.reason})`)
          .join(', ')} — see SPEC §43.`,
      );
    }

    client?.capture(event, safe);
  },

  identify(userId) {
    if (!isSafeDistinctId(userId)) {
      // An email here would attach a real identity to every event ever captured. Refusing is
      // the only safe answer, and it is loud in development.
      if (__DEV__) {
        console.error('[analytics] refused a distinct id that is not a Supabase user id.');
      }
      return;
    }

    if (!enabled()) return;
    client?.identify(userId);
  },

  reset() {
    // On sign-out, so the next person on this device is not the previous one.
    client?.reset();
  },

  setConsent(granted) {
    consentGranted = granted;

    // `optIn`/`optOut` take effect immediately, which is what withdrawal has to mean.
    if (granted) client?.optIn();
    else client?.optOut();
  },
};

/** Test-only. */
export const resetAnalyticsForTests = (): void => {
  client = null;
  consentGranted = false;
};

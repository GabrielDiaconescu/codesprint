import * as Sentry from '@sentry/react-native';

import { getEnv, isProduction } from '@/lib/env';

import type { MonitoringService } from '../types';

/**
 * Sentry (SPEC §44).
 *
 * Crashes and JS errors, with source maps uploaded during EAS builds. What it must never carry
 * is personal data: `sendDefaultPii` is off, request bodies are stripped, and `beforeSend`
 * scrubs anything that slipped through.
 *
 * Unlike analytics, monitoring does **not** wait for consent. A crash report contains no
 * behavioural profile — it is a stack trace and a device model — and the legal basis for it is
 * legitimate interest rather than consent (SPEC §41 lists it separately for exactly this
 * reason, and notes that the basis is documented in `LEGAL.md` for review).
 *
 * Without a DSN it does nothing at all.
 */

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;

/** Replaces anything that looks like an address, wherever it turns up. */
const scrub = (value: string): string => value.replace(EMAIL, '[redacted-email]');

let started = false;

export const SentryMonitoringService: MonitoringService = {
  serviceName: 'SentryMonitoringService',
  isNoop: false,

  async initialize() {
    if (started) return;

    const dsn = getEnv().EXPO_PUBLIC_SENTRY_DSN;
    if (!dsn) return;

    Sentry.init({
      dsn,
      environment: getEnv().EXPO_PUBLIC_APP_ENV,
      // Off by default and deliberately left off: this is what would attach IP addresses and
      // usernames to every event (SPEC §44).
      sendDefaultPii: false,
      // Full sampling of errors; traces only in production, and sparsely, because performance
      // monitoring is the part that costs money at volume (SPEC §60).
      tracesSampleRate: isProduction() ? 0.1 : 0,
      beforeSend(event) {
        // A last pass over anything that reached the payload regardless of the settings
        // above — a message built from an API error, say, that happened to quote an address.
        if (event.message) event.message = scrub(event.message);

        for (const exception of event.exception?.values ?? []) {
          if (exception.value) exception.value = scrub(exception.value);
        }

        // Request bodies are never useful for a mobile crash and are the single most likely
        // place for personal data to appear (SPEC §44).
        if (event.request) {
          delete event.request.data;
          delete event.request.cookies;
          delete event.request.headers;
        }

        return event;
      },
    });

    started = true;
  },

  captureException(error, context) {
    if (!started) {
      if (__DEV__) console.warn('[monitoring]', error, context ?? {});
      return;
    }
    Sentry.captureException(error, context ? { extra: context } : undefined);
  },

  captureMessage(message, context) {
    if (!started) {
      if (__DEV__) console.warn('[monitoring]', message, context ?? {});
      return;
    }
    Sentry.captureMessage(scrub(message), context ? { extra: context } : undefined);
  },

  setUser(userId) {
    if (!started) return;
    // The pseudonymous Supabase id and nothing else — no email, no display name (SPEC §44).
    Sentry.setUser(userId === null ? null : { id: userId });
  },
};

/** Test-only. */
export const resetMonitoringForTests = (): void => {
  started = false;
};

import { z } from 'zod';

/**
 * Environment validation (SPEC §56).
 *
 * EXPO_PUBLIC_* values are embedded in the app bundle and are PUBLIC BY DESIGN.
 * No secret may ever be named EXPO_PUBLIC_* (SPEC §59.27).
 *
 * Validation is PHASE-AWARE: variables introduced by a later phase are optional while that
 * phase is unbuilt, so early phases stay runnable. In a `production` build every shipped
 * integration is required, so a misconfigured release fails at startup rather than at the user.
 */

export const APP_ENVIRONMENTS = ['development', 'preview', 'production'] as const;
export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

/**
 * Phases whose integrations have shipped. Extend this as phases complete; the production
 * schema then starts requiring the matching variables.
 */
const SHIPPED = {
  supabase: true, // Phase 3 — shipped
  revenueCat: true, // Phase 14 — shipped
  admob: true, // Phase 15 — shipped
  postHog: true, // Phase 16 — shipped
  // Optional even in production: a build without a DSN simply reports nothing, which is
  // worse than having it but is not a reason to refuse to start (SPEC §44).
  sentry: false, // Phase 16 — written, DSN still a pending human action
  legalPages: true, // Phase 18 — shipped; pages in web/, hosted by a human action
} as const;

/** `required` in production once the phase ships; otherwise optional everywhere. */
const whenShipped = (shipped: boolean, schema: z.ZodString, isProduction: boolean) =>
  shipped && isProduction ? schema : schema.optional();

const buildSchema = (isProduction: boolean) =>
  z
    .object({
      EXPO_PUBLIC_APP_ENV: z.enum(APP_ENVIRONMENTS),

      // Phase 3 — Supabase
      EXPO_PUBLIC_SUPABASE_URL: whenShipped(SHIPPED.supabase, z.string().url(), isProduction),
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: whenShipped(
        SHIPPED.supabase,
        z.string().min(1),
        isProduction,
      ),

      // Phase 14 — RevenueCat (public SDK keys only; secret keys live server-side)
      EXPO_PUBLIC_REVENUECAT_IOS_KEY: whenShipped(
        SHIPPED.revenueCat,
        z.string().min(1),
        isProduction,
      ),
      EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: whenShipped(
        SHIPPED.revenueCat,
        z.string().min(1),
        isProduction,
      ),
      /**
       * RevenueCat's Test Store — purchases that behave like real ones with no App Store or
       * Play account behind them. One key for both platforms, because there is no platform.
       *
       * Development and preview ONLY. The refinement below makes a production build carrying
       * this key fail to start, which is the point: a released app whose purchases are fake
       * would take real money for nothing, or take none at all and look broken.
       */
      EXPO_PUBLIC_REVENUECAT_TEST_KEY: z.string().min(1).optional(),

      // Phase 15 — AdMob production unit ids (dev/preview always use Google test ids, SPEC §59.31)
      EXPO_PUBLIC_ADMOB_BANNER_ID_IOS: whenShipped(SHIPPED.admob, z.string().min(1), isProduction),
      EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID: whenShipped(
        SHIPPED.admob,
        z.string().min(1),
        isProduction,
      ),
      EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_IOS: whenShipped(
        SHIPPED.admob,
        z.string().min(1),
        isProduction,
      ),
      EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_ANDROID: whenShipped(
        SHIPPED.admob,
        z.string().min(1),
        isProduction,
      ),
      EXPO_PUBLIC_ADMOB_REWARDED_ID_IOS: whenShipped(
        SHIPPED.admob,
        z.string().min(1),
        isProduction,
      ),
      EXPO_PUBLIC_ADMOB_REWARDED_ID_ANDROID: whenShipped(
        SHIPPED.admob,
        z.string().min(1),
        isProduction,
      ),

      // Phase 16 — analytics + monitoring
      EXPO_PUBLIC_POSTHOG_KEY: whenShipped(SHIPPED.postHog, z.string().min(1), isProduction),
      EXPO_PUBLIC_POSTHOG_HOST: whenShipped(SHIPPED.postHog, z.string().url(), isProduction),
      EXPO_PUBLIC_SENTRY_DSN: whenShipped(SHIPPED.sentry, z.string().url(), isProduction),

      // Phase 18 — static legal/support pages
      EXPO_PUBLIC_LEGAL_BASE_URL: whenShipped(SHIPPED.legalPages, z.string().url(), isProduction),
    })
    .superRefine((env, ctx) => {
      // D7 and SPEC §41 put analytics in the EU. The SDK's own default is the US host, and
      // PostHog's onboarding hands out whichever region you happened to sign up in — so this
      // is a mistake that arrives already made, in a snippet, looking correct.
      //
      // A `phc_` key belongs to ONE cloud, so a US project cannot simply be pointed at the EU
      // host: getting this wrong means either no analytics at all, or EU learners' data in
      // the United States. Neither should be discovered after release.
      const host = env.EXPO_PUBLIC_POSTHOG_HOST;
      if (isProduction && host && !/^https:\/\/[a-z-]*\.?eu\.(i\.)?posthog\.com/.test(host)) {
        ctx.addIssue({
          code: 'custom',
          path: ['EXPO_PUBLIC_POSTHOG_HOST'],
          message:
            'Analytics must use a PostHog EU host (SPEC §41, D7). Got: ' +
            host +
            '. A US project key cannot be pointed at the EU host — create an EU project.',
        });
      }

      if (isProduction && env.EXPO_PUBLIC_REVENUECAT_TEST_KEY) {
        ctx.addIssue({
          code: 'custom',
          path: ['EXPO_PUBLIC_REVENUECAT_TEST_KEY'],
          message:
            'The RevenueCat Test Store key must never reach production — its purchases are ' +
            'simulated. Remove it from the production environment.',
        });
      }
    });

export type Env = z.infer<ReturnType<typeof buildSchema>>;

/**
 * Raw values must be referenced as static `process.env.X` properties: the Expo bundler
 * inlines them at build time and cannot resolve dynamic lookups.
 */
const readRawEnv = (): Record<string, string | undefined> => ({
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  EXPO_PUBLIC_REVENUECAT_IOS_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  EXPO_PUBLIC_REVENUECAT_TEST_KEY: process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY,
  EXPO_PUBLIC_ADMOB_BANNER_ID_IOS: process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_IOS,
  EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID: process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID,
  EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_IOS: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_IOS,
  EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_ANDROID: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_ANDROID,
  EXPO_PUBLIC_ADMOB_REWARDED_ID_IOS: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID_IOS,
  EXPO_PUBLIC_ADMOB_REWARDED_ID_ANDROID: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID_ANDROID,
  EXPO_PUBLIC_POSTHOG_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY,
  EXPO_PUBLIC_POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST,
  EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
  EXPO_PUBLIC_LEGAL_BASE_URL: process.env.EXPO_PUBLIC_LEGAL_BASE_URL,
});

export class EnvValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid environment configuration:\n${issues.map((i) => `  - ${i}`).join('\n')}`);
    this.name = 'EnvValidationError';
  }
}

/** Pure and testable: validates an arbitrary record rather than reading process.env itself. */
export const parseEnv = (raw: Record<string, string | undefined>): Env => {
  const isProduction = raw.EXPO_PUBLIC_APP_ENV === 'production';
  const result = buildSchema(isProduction).safeParse(raw);

  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
    );
  }
  return result.data;
};

let cached: Env | undefined;

/** Validated environment. Throws at startup on misconfiguration (SPEC §46: fail loudly, early). */
export const getEnv = (): Env => {
  cached ??= parseEnv(readRawEnv());
  return cached;
};

/** Test-only: clears the memoised value. */
export const resetEnvCache = (): void => {
  cached = undefined;
};

export const isProduction = (): boolean => getEnv().EXPO_PUBLIC_APP_ENV === 'production';
export const isDevelopment = (): boolean => getEnv().EXPO_PUBLIC_APP_ENV === 'development';

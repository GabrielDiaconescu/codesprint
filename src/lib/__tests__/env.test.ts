import { EnvValidationError, parseEnv } from '../env';

/**
 * Environment validation is the first thing that runs at startup, so its failure modes
 * matter more than its happy path (SPEC §56).
 */
describe('parseEnv', () => {
  const minimalDev = { EXPO_PUBLIC_APP_ENV: 'development' };

  it('accepts a minimal development environment', () => {
    expect(parseEnv(minimalDev).EXPO_PUBLIC_APP_ENV).toBe('development');
  });

  it('accepts preview and production values for APP_ENV', () => {
    expect(parseEnv({ EXPO_PUBLIC_APP_ENV: 'preview' }).EXPO_PUBLIC_APP_ENV).toBe('preview');
  });

  it('rejects a missing APP_ENV', () => {
    expect(() => parseEnv({})).toThrow(EnvValidationError);
  });

  it('rejects an unknown APP_ENV', () => {
    expect(() => parseEnv({ EXPO_PUBLIC_APP_ENV: 'staging' })).toThrow(EnvValidationError);
  });

  it('reports the offending variable by name', () => {
    try {
      parseEnv({ EXPO_PUBLIC_APP_ENV: 'nonsense' });
      throw new Error('expected parseEnv to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      expect((error as EnvValidationError).issues.join()).toContain('EXPO_PUBLIC_APP_ENV');
    }
  });

  it('rejects a malformed URL when the variable is present', () => {
    expect(() => parseEnv({ ...minimalDev, EXPO_PUBLIC_SUPABASE_URL: 'not-a-url' })).toThrow(
      EnvValidationError,
    );
  });

  it('allows unshipped-phase variables to be absent in development', () => {
    // RevenueCat, AdMob and PostHog are not built yet, so a dev build must still boot
    // without them. This is what keeps early phases runnable.
    expect(() => parseEnv(minimalDev)).not.toThrow();
    expect(() => parseEnv({ EXPO_PUBLIC_APP_ENV: 'preview' })).not.toThrow();
  });

  /** Everything a production build must carry, as of the phases shipped so far. */
  const productionEnv = {
    EXPO_PUBLIC_APP_ENV: 'production',
    EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'pk_test',
    EXPO_PUBLIC_REVENUECAT_IOS_KEY: 'appl_ios',
    EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: 'goog_android',
    EXPO_PUBLIC_ADMOB_BANNER_ID_IOS: 'ca-app-pub-x/1',
    EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID: 'ca-app-pub-x/2',
    EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_IOS: 'ca-app-pub-x/3',
    EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_ANDROID: 'ca-app-pub-x/4',
    EXPO_PUBLIC_ADMOB_REWARDED_ID_IOS: 'ca-app-pub-x/5',
    EXPO_PUBLIC_ADMOB_REWARDED_ID_ANDROID: 'ca-app-pub-x/6',
    EXPO_PUBLIC_POSTHOG_KEY: 'phc_test',
    EXPO_PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com',
    EXPO_PUBLIC_LEGAL_BASE_URL: 'https://codesprint.example',
  };

  it('requires a SHIPPED integration in production', () => {
    // Supabase shipped in Phase 3, so a production build without it must fail at startup
    // rather than at the user. Each phase flips its own flag in SHIPPED.
    expect(() => parseEnv({ EXPO_PUBLIC_APP_ENV: 'production' })).toThrow(EnvValidationError);

    try {
      parseEnv({ EXPO_PUBLIC_APP_ENV: 'production' });
    } catch (error) {
      expect((error as EnvValidationError).issues.join()).toContain('EXPO_PUBLIC_SUPABASE_URL');
    }
  });

  it('requires the AdMob unit ids in production, now that ads have shipped', () => {
    try {
      parseEnv({
        ...productionEnv,
        EXPO_PUBLIC_ADMOB_BANNER_ID_IOS: undefined,
      });
      throw new Error('expected validation to fail');
    } catch (error) {
      expect((error as EnvValidationError).issues.join()).toContain(
        'EXPO_PUBLIC_ADMOB_BANNER_ID_IOS',
      );
    }
  });

  it('requires the legal pages in production, now that Phase 18 has shipped them', () => {
    // The privacy policy and terms must be one tap away on the paywall and in Profile, as both
    // stores require (SPEC §33, §41). A production build without them must not start.
    try {
      parseEnv({ ...productionEnv, EXPO_PUBLIC_LEGAL_BASE_URL: undefined });
      throw new Error('expected validation to fail');
    } catch (error) {
      expect((error as EnvValidationError).issues.join()).toContain('EXPO_PUBLIC_LEGAL_BASE_URL');
    }
  });

  it('requires the PostHog key in production, now that analytics has shipped', () => {
    try {
      parseEnv({ ...productionEnv, EXPO_PUBLIC_POSTHOG_KEY: undefined });
      throw new Error('expected validation to fail');
    } catch (error) {
      expect((error as EnvValidationError).issues.join()).toContain('EXPO_PUBLIC_POSTHOG_KEY');
    }
  });

  describe('the PostHog region (SPEC §41, D7)', () => {
    it.each(['https://eu.i.posthog.com', 'https://eu.posthog.com'])(
      'accepts the EU host %s',
      (host) => {
        expect(() => parseEnv({ ...productionEnv, EXPO_PUBLIC_POSTHOG_HOST: host })).not.toThrow();
      },
    );

    /**
     * The mistake this exists to stop arrives already made, in a snippet: PostHog's onboarding
     * hands out whichever region you signed up in, and `us.i.posthog.com` looks exactly as
     * correct as the EU one. Shipping it means EU learners' analytics in the United States.
     */
    it.each(['https://us.i.posthog.com', 'https://app.posthog.com', 'https://us.posthog.com'])(
      'REFUSES %s in production',
      (host) => {
        try {
          parseEnv({ ...productionEnv, EXPO_PUBLIC_POSTHOG_HOST: host });
          throw new Error('expected validation to fail');
        } catch (error) {
          expect((error as EnvValidationError).issues.join()).toContain('EXPO_PUBLIC_POSTHOG_HOST');
        }
      },
    );

    it('allows any host in development, where a scratch project is fine', () => {
      expect(() =>
        parseEnv({
          EXPO_PUBLIC_APP_ENV: 'development',
          EXPO_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com',
        }),
      ).not.toThrow();
    });
  });

  it('does NOT require a Sentry DSN, which is optional even in production', () => {
    // A build without it reports nothing, which is worse than having it but is not a reason
    // to refuse to start (SPEC §44).
    expect(() => parseEnv({ ...productionEnv, EXPO_PUBLIC_SENTRY_DSN: undefined })).not.toThrow();
  });

  it('requires the RevenueCat SDK keys in production, now that billing has shipped', () => {
    try {
      parseEnv({
        EXPO_PUBLIC_APP_ENV: 'production',
        EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'pk_test',
      });
      throw new Error('expected validation to fail');
    } catch (error) {
      expect((error as EnvValidationError).issues.join()).toContain(
        'EXPO_PUBLIC_REVENUECAT_IOS_KEY',
      );
    }
  });

  /**
   * The Test Store is RevenueCat's simulated storefront: real-looking purchases with no App
   * Store or Play account behind them. Wonderful for development, catastrophic in a release —
   * the app would either charge real money for nothing or charge none at all and look broken.
   */
  it('REFUSES the Test Store key in production', () => {
    try {
      parseEnv({ ...productionEnv, EXPO_PUBLIC_REVENUECAT_TEST_KEY: 'test_abc' });
      throw new Error('expected validation to fail');
    } catch (error) {
      expect((error as EnvValidationError).issues.join()).toContain(
        'EXPO_PUBLIC_REVENUECAT_TEST_KEY',
      );
    }
  });

  it.each(['development', 'preview'])('allows the Test Store key in %s', (appEnv) => {
    expect(() =>
      parseEnv({ EXPO_PUBLIC_APP_ENV: appEnv, EXPO_PUBLIC_REVENUECAT_TEST_KEY: 'test_abc' }),
    ).not.toThrow();
  });

  it('accepts a fully populated production environment', () => {
    expect(() => parseEnv(productionEnv)).not.toThrow();
  });
});

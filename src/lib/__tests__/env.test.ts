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

  it('accepts a fully populated production environment', () => {
    expect(() =>
      parseEnv({
        EXPO_PUBLIC_APP_ENV: 'production',
        EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'pk_test',
        EXPO_PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com',
      }),
    ).not.toThrow();
  });
});

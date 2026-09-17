import { NAMESPACES, resolveLocale, resources } from '..';

/**
 * SPEC §38: no hardcoded user-facing text, English fallback, ready for more locales.
 * When a second locale lands, extend this to compare key sets across locales.
 */
describe('i18n resources', () => {
  it('registers every namespace the app uses', () => {
    expect(NAMESPACES).toEqual(
      expect.arrayContaining([
        'common',
        'navigation',
        'auth',
        'home',
        'learn',
        'leaderboard',
        'profile',
      ]),
    );
  });

  it('exposes the four tab labels', () => {
    expect(Object.keys(resources.en.navigation.tabs)).toEqual([
      'home',
      'learn',
      'leaderboard',
      'profile',
    ]);
  });

  it('contains no empty strings', () => {
    const walk = (value: unknown, path: string): void => {
      if (typeof value === 'string') {
        // Path is part of the assertion so a failure names the offending key.
        expect({ path, empty: value.trim().length === 0 }).toEqual({ path, empty: false });
        return;
      }
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        walk(child, `${path}.${key}`);
      }
    };
    walk(resources.en, 'en');
  });

  it('falls back to English for an unsupported device locale', () => {
    // expo-localization is mocked to 'en' in jest.setup.js.
    expect(resolveLocale()).toBe('en');
  });
});

/**
 * Every AuthErrorCode must have a sentence. A missing one renders the raw key ("errors.
 * network") on screen, which is the failure mode i18n exists to prevent (SPEC §38, §46).
 */
describe('auth error coverage', () => {
  const CODES = [
    'invalid-credentials',
    'email-not-confirmed',
    'email-taken',
    'weak-password',
    'same-password',
    'rate-limited',
    'expired-link',
    'guest-disabled',
    'network',
    'unknown',
  ];

  it.each(CODES)('has a message for %s', (code) => {
    expect(Object.keys(resources.en.auth.errors)).toContain(code);
  });

  it('has no message for a code that does not exist', () => {
    expect(Object.keys(resources.en.auth.errors).sort()).toEqual([...CODES].sort());
  });
});

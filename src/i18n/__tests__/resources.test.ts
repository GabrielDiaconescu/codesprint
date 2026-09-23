import {
  NAMESPACES,
  parseLanguagePreference,
  resolveLocale,
  resources,
  SUPPORTED_LOCALES,
} from '..';

/**
 * SPEC §38: no hardcoded user-facing text, English fallback, and — since Romanian shipped —
 * every locale kept in step with English (see "locale parity" below).
 */
describe('i18n resources', () => {
  it('registers every namespace the app uses', () => {
    expect(NAMESPACES).toEqual(
      expect.arrayContaining([
        'common',
        'navigation',
        'auth',
        'onboarding',
        'home',
        'learn',
        'lesson',
        'practice',
        'challenge',
        'leaderboard',
        'profile',
        'progress',
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

/**
 * Every option the app can offer must have a label. A missing one renders the raw key
 * ("experience.options.intermediate.label") inside a card the user is asked to choose.
 */
describe('onboarding option coverage', () => {
  it.each(['complete_beginner', 'beginner', 'intermediate'])(
    'has a label and description for experience level %s',
    (level) => {
      const option =
        resources.en.onboarding.experience.options[
          level as keyof typeof resources.en.onboarding.experience.options
        ];
      expect(Object.keys(option)).toEqual(expect.arrayContaining(['label', 'description']));
    },
  );

  it.each(['university', 'career', 'interview', 'personal', 'improve'])(
    'has a label and description for motivation %s',
    (motivation) => {
      const option =
        resources.en.onboarding.motivation.options[
          motivation as keyof typeof resources.en.onboarding.motivation.options
        ];
      expect(Object.keys(option)).toEqual(expect.arrayContaining(['label', 'description']));
    },
  );

  it.each(['5', '10', '15'])('has a label for the %s minute daily goal', (minutes) => {
    const option =
      resources.en.onboarding.goal.options[
        minutes as keyof typeof resources.en.onboarding.goal.options
      ];
    expect(option.label.length).toBeGreaterThan(0);
  });
});

/**
 * Every locale says everything English says (SPEC §38).
 *
 * A key missing from Romanian does not crash: i18next quietly falls back to English, and the
 * learner gets a screen in two languages. That is exactly the kind of defect nobody reports and
 * everybody sees, so parity is asserted rather than hoped for.
 */
describe('locale parity', () => {
  const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

  type Entries = Map<string, string[]>;

  /** Flattens a namespace to `path -> [every string under that path, all plural forms]`. */
  const flatten = (value: unknown, prefix = '', into: Entries = new Map()): Entries => {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof child === 'string') {
        const base = path.replace(PLURAL_SUFFIX, '');
        into.set(base, [...(into.get(base) ?? []), child]);
      } else {
        flatten(child, path, into);
      }
    }
    return into;
  };

  /** Raw keys, suffixes kept — for checking which plural forms exist. */
  const rawKeys = (value: unknown, prefix = ''): string[] =>
    Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof child === 'string' ? [path] : rawKeys(child, path);
    });

  const variables = (strings: string[]): string[] =>
    [
      ...new Set(strings.flatMap((s) => [...s.matchAll(/\{\{\s*(\w+)/g)].map((m) => m[1] ?? ''))),
    ].sort();

  const others = SUPPORTED_LOCALES.filter((locale) => locale !== 'en');

  it('ships at least one locale besides English', () => {
    // Otherwise everything below passes vacuously.
    expect(others.length).toBeGreaterThan(0);
  });

  describe.each(others)('%s', (locale) => {
    const english = resources.en as Record<string, unknown>;
    const translated = resources[locale] as Record<string, unknown>;

    it('has exactly the namespaces English has', () => {
      expect(Object.keys(translated).sort()).toEqual(Object.keys(english).sort());
    });

    it.each(NAMESPACES)('translates every key in %s, and nothing extra', (ns) => {
      const en = [...flatten(english[ns]).keys()].sort();
      const tr = [...flatten(translated[ns]).keys()].sort();
      expect({
        ns,
        missing: en.filter((k) => !tr.includes(k)),
        extra: tr.filter((k) => !en.includes(k)),
      }).toEqual({ ns, missing: [], extra: [] });
    });

    it.each(NAMESPACES)('keeps the same {{variables}} in %s', (ns) => {
      const en = flatten(english[ns]);
      const tr = flatten(translated[ns]);
      const mismatched = [...en.entries()]
        .filter(([key, strings]) => {
          const translatedStrings = tr.get(key);
          return (
            translatedStrings !== undefined &&
            variables(translatedStrings).join() !== variables(strings).join()
          );
        })
        .map(([key]) => key);
      // A dropped {{count}} prints a sentence without its number; an invented one prints the
      // braces themselves.
      expect({ ns, mismatched }).toEqual({ ns, mismatched: [] });
    });

    it.each(NAMESPACES)('gives every plural in %s all the forms the language needs', (ns) => {
      const categories = new Intl.PluralRules(locale).resolvedOptions().pluralCategories;
      const keys = rawKeys(translated[ns]);
      const pluralBases = [
        ...new Set(
          keys.filter((k) => PLURAL_SUFFIX.test(k)).map((k) => k.replace(PLURAL_SUFFIX, '')),
        ),
      ];
      const incomplete = pluralBases.flatMap((base) =>
        categories.filter((c) => !keys.includes(`${base}_${c}`)).map((c) => `${base}_${c}`),
      );
      // Romanian needs three: 1 întrebare, 3 întrebări, 20 de întrebări. A missing `_few`
      // would silently borrow the wrong form.
      expect({ ns, incomplete }).toEqual({ ns, incomplete: [] });
    });

    it('contains no empty strings', () => {
      const empty = NAMESPACES.flatMap((ns) =>
        [...flatten(translated[ns]).entries()]
          .filter(([, strings]) => strings.some((s) => s.trim().length === 0))
          .map(([key]) => `${ns}.${key}`),
      );
      expect(empty).toEqual([]);
    });
  });

  it('writes Romanian with comma-below ș and ț, never the cedilla look-alikes', () => {
    // SPEC §38. ş and ţ (U+015F, U+0163) are Turkish letters that look almost identical; many
    // keyboards produce them, and they are simply wrong in Romanian.
    const cedillas = NAMESPACES.flatMap((ns) =>
      [...flatten((resources.ro as Record<string, unknown>)[ns]).entries()]
        .filter(([, strings]) => strings.some((s) => /[ŞşŢţ]/.test(s)))
        .map(([key]) => `${ns}.${key}`),
    );
    expect(cedillas).toEqual([]);
  });
});

describe('language preference', () => {
  it('honours an explicit choice', () => {
    expect(resolveLocale('ro')).toBe('ro');
    expect(resolveLocale('en')).toBe('en');
  });

  it('follows the phone for "system"', () => {
    // expo-localization is mocked to English in jest.setup.js.
    expect(resolveLocale('system')).toBe('en');
  });

  it('treats a stored locale this build does not ship as "system"', () => {
    // A preference saved by a build that had German must not leave the app without a language.
    expect(parseLanguagePreference('de')).toBe('system');
    expect(parseLanguagePreference(undefined)).toBe('system');
    expect(parseLanguagePreference('ro')).toBe('ro');
  });
});

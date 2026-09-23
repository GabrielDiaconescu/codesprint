import { createInstance } from 'i18next';

import { SUPPORTED_LOCALES } from '..';
import roProgress from '../locales/ro/progress.json';

/**
 * Plurals on an engine without `Intl.PluralRules` (SPEC §38).
 *
 * Node has complete plural rules and Hermes has none, so every other test in this suite runs
 * on an engine the app never does. Here the phone's engine is reproduced by removing
 * `Intl.PluralRules` — the one difference that matters — and the polyfill has to put it back.
 */
const native = Intl.PluralRules;

function withoutNativePluralRules<T>(run: () => T): T {
  // @ts-expect-error — deliberately removing a built-in, to stand in for Hermes.
  delete Intl.PluralRules;
  try {
    return run();
  } finally {
    Object.defineProperty(Intl, 'PluralRules', {
      configurable: true,
      enumerable: false,
      writable: true,
      value: native,
    });
  }
}

/**
 * Runs `pluralRules.ts` afresh, as app start-up does. Isolated, because a module runs once per
 * registry and each test needs it to run against the `Intl` that test has set up.
 */
function loadPolyfill(): void {
  jest.isolateModules(() => {
    jest.requireActual('../pluralRules');
  });
}

/** What the phone shows for `stats.streakDays`, given whatever `Intl` currently has. */
function streakDays(count: number): string {
  const i18n = createInstance();
  void i18n.init({
    lng: 'ro',
    initAsync: false,
    resources: { ro: { progress: roProgress } },
  });
  return i18n.t('stats.streakDays', { ns: 'progress', count });
}

const SAMPLE = [0, 1, 2, 5, 19, 20, 21, 100, 101, 119, 120, 1.5];

describe('plural rules on Hermes', () => {
  it('documents the failure it prevents', () => {
    // Without the polyfill i18next knows only `one` and `other`, so Romanian loses `few`.
    expect(withoutNativePluralRules(() => streakDays(0))).toBe('0 de zile');
  });

  it('gives Romanian its `few` form once the polyfill is in', () => {
    const shown = withoutNativePluralRules(() => {
      loadPolyfill();
      return [0, 1, 3, 20].map(streakDays);
    });

    expect(shown).toEqual(['0 zile', '1 zi', '3 zile', '20 de zile']);
  });

  it.each(SUPPORTED_LOCALES)('%s: the polyfill agrees with a complete engine', (locale) => {
    // A locale added to the app without its data file fails here: the polyfill throws for a
    // locale it has no data for, which is the reminder to add the import in pluralRules.ts.
    const expected = SAMPLE.map((n) => new native(locale).select(n));

    const actual = withoutNativePluralRules(() => {
      loadPolyfill();
      const polyfilled = new Intl.PluralRules(locale);
      return SAMPLE.map((n) => polyfilled.select(n));
    });

    expect(actual).toEqual(expected);
  });

  it('leaves a complete engine alone', () => {
    loadPolyfill();

    expect(Intl.PluralRules).toBe(native);
  });
});

import { formatScore, greeting, nextLocale, nextScheme, showLanguageToggle } from '../header';

/**
 * Home's header rules (SPEC §13).
 *
 * Each of these is a one-line function guarding a failure that looks like a typo in a
 * screenshot: "Hello !", a language button that does nothing, a sun icon that turns the lights
 * off.
 */

describe('greeting', () => {
  it('uses the name when there is one', () => {
    expect(greeting('Alex')).toEqual({ key: 'greeting.named', name: 'Alex' });
  });

  it('falls back for a guest, who has no display name at all (D1)', () => {
    expect(greeting(null)).toEqual({ key: 'greeting.anonymous' });
    expect(greeting(undefined)).toEqual({ key: 'greeting.anonymous' });
  });

  it('treats a blank name as no name, rather than greeting a space', () => {
    // A display name of spaces is what you get from a half-finished profile form.
    expect(greeting('   ')).toEqual({ key: 'greeting.anonymous' });
    expect(greeting('')).toEqual({ key: 'greeting.anonymous' });
  });

  it('trims, so the greeting never renders a hanging space before the exclamation', () => {
    expect(greeting('  Alex  ')).toEqual({ key: 'greeting.named', name: 'Alex' });
  });
});

describe('showLanguageToggle', () => {
  it('is hidden while English is the only locale (SPEC §29, §38)', () => {
    expect(showLanguageToggle(['en'])).toBe(false);
  });

  it('appears as soon as a second locale ships, with no other change', () => {
    expect(showLanguageToggle(['en', 'ro'])).toBe(true);
  });

  it('is hidden rather than crashing when there are somehow no locales', () => {
    expect(showLanguageToggle([])).toBe(false);
  });
});

describe('nextLocale', () => {
  it('cycles', () => {
    expect(nextLocale('en', ['en', 'ro'])).toBe('ro');
    expect(nextLocale('ro', ['en', 'ro'])).toBe('en');
  });

  it('keeps cycling past two, so a third language needs no new control', () => {
    expect(nextLocale('en', ['en', 'ro', 'de'])).toBe('ro');
    expect(nextLocale('de', ['en', 'ro', 'de'])).toBe('en');
  });

  it('starts from the beginning when the current locale is not one we ship', () => {
    // i18next can hold a region-tagged locale like `en-GB` that is not a key in `resources`.
    expect(nextLocale('en-GB', ['en', 'ro'])).toBe('en');
  });

  it('returns the current locale rather than undefined when there are none', () => {
    expect(nextLocale('en', [])).toBe('en');
  });
});

describe('nextScheme', () => {
  it('flips the resolved scheme, not the preference', () => {
    // The button takes what is ON SCREEN. Passing the preference would make the first tap a
    // no-op for anyone on `system` whose system already matches.
    expect(nextScheme('light')).toBe('dark');
    expect(nextScheme('dark')).toBe('light');
  });
});

describe('formatScore', () => {
  it('groups thousands, because an XP total is meant to be read at a glance', () => {
    expect(formatScore(2840, 'en')).toBe('2,840');
  });

  it('leaves small numbers alone', () => {
    expect(formatScore(0, 'en')).toBe('0');
    expect(formatScore(75, 'en')).toBe('75');
  });

  it('formats an unknown but well-formed locale instead of refusing it', () => {
    // `not-a-locale` parses as a valid BCP-47 tag, so Intl resolves it to a default rather
    // than throwing. Whatever separator that default uses, the digits must all survive.
    expect(formatScore(2840, 'not-a-locale')).toMatch(/^2\D?840$/);
  });

  it('falls back to the plain number rather than throwing on a malformed locale', () => {
    // Hermes ships Intl, but a damaged or truncated tag must not take Home down over a
    // thousands separator (SPEC §46). These are the tags that actually raise RangeError.
    expect(formatScore(2840, 'en-')).toBe('2840');
    expect(formatScore(2840, '')).toBe('2840');
  });
});

import { localize } from '../localize';

/**
 * Every title, prompt and explanation the app shows passes through here, so its failure mode
 * matters: a wrong locale is a small problem, an empty string on screen is a large one.
 */
describe('localize', () => {
  it('returns the requested locale when it exists', () => {
    expect(localize({ en: 'Variables', ro: 'Variabile' }, 'ro')).toBe('Variabile');
  });

  it('falls back to English when the locale is missing', () => {
    expect(localize({ en: 'Variables' }, 'ro')).toBe('Variables');
  });

  it('falls back to English when the locale is present but empty', () => {
    // A half-finished translation must not blank the screen.
    expect(localize({ en: 'Variables', ro: '' }, 'ro')).toBe('Variables');
  });

  it('falls back to any available string when English is missing too', () => {
    expect(localize({ ro: 'Variabile' }, 'de')).toBe('Variabile');
  });

  it('accepts a plain string, in case a field was never localized', () => {
    expect(localize('Variables', 'en')).toBe('Variables');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a number', 42],
    ['an array', ['Variables']],
    ['an empty object', {}],
    ['an object of non-strings', { en: 42 }],
  ])('returns an empty string for %s rather than throwing', (_label, value) => {
    expect(localize(value, 'en')).toBe('');
  });
});

import { palettes, syntaxPalette, type Palette } from '../colors';
import { AA_NON_TEXT, AA_TEXT, contrastRatio, meetsContrast, relativeLuminance } from '../contrast';

/**
 * WCAG 2.1 AA, asserted rather than claimed (SPEC §47).
 *
 * Every pair below is one the app actually renders. That is the point: a palette can be
 * "accessible" on average and still put a 3.1:1 label inside a badge, which is what this
 * found. A colour nudged half a shade for looks now fails here instead of failing somebody
 * with low vision.
 *
 * Text needs 4.5:1 (1.4.3). Icons and the outlines that identify a control need 3:1 (1.4.11).
 * Decorative outlines — a card edge, a divider — are exempt, and are deliberately absent.
 */

const themes = Object.entries(palettes) as [keyof typeof palettes, Palette][];

/** Text on the three things text sits on. */
const TEXT_ON_SURFACES: [keyof Palette, keyof Palette][] = [
  ['textPrimary', 'background'],
  ['textPrimary', 'surface'],
  ['textPrimary', 'surfaceElevated'],
  ['textSecondary', 'background'],
  ['textSecondary', 'surface'],
  ['textSecondary', 'surfaceElevated'],
];

/** Semantic text: the feedback panel and the badge labels. */
const SEMANTIC_TEXT: [keyof Palette, keyof Palette][] = [
  ['success', 'successSurface'],
  ['success', 'background'],
  ['success', 'surface'],
  ['danger', 'dangerSurface'],
  ['danger', 'background'],
  ['danger', 'surface'],
  ['warning', 'warningSurface'],
  ['warning', 'background'],
  ['warning', 'surface'],
  // The neutral badge is a textSecondary label on the border colour.
  ['textSecondary', 'border'],
  // Buttons.
  ['onPrimary', 'primary'],
  ['onPrimary', 'primaryPressed'],
  // Links and the primary-tinted labels.
  ['primary', 'background'],
  ['primary', 'surface'],
];

/** Icons and progress fills — graphics, not words. */
const GRAPHICS: [keyof Palette, keyof Palette][] = [
  ['streak', 'background'],
  ['streak', 'surface'],
  ['streak', 'warningSurface'],
  ['xp', 'background'],
  ['xp', 'surface'],
  ['xp', 'warningSurface'],
  ['life', 'background'],
  ['life', 'surface'],
  ['primary', 'background'],
];

/** Outlines that identify a control rather than decorate a box. */
const CONTROL_OUTLINES: [keyof Palette, keyof Palette][] = [
  ['borderStrong', 'surface'],
  ['borderStrong', 'background'],
  ['borderStrong', 'surfaceElevated'],
  ['primary', 'surface'],
  ['danger', 'surface'],
];

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for a colour on itself', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#3B5BFF', '#3B5BFF')).toBeCloseTo(1, 5);
  });

  it('does not care which way round the two colours are given', () => {
    expect(contrastRatio('#12151F', '#FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#12151F'), 9);
  });

  it('refuses anything that is not a hex colour, rather than returning NaN', () => {
    // A NaN here would make every assertion below pass silently, which is worse than no test.
    expect(() => relativeLuminance('rgb(0,0,0)')).toThrow(/hex/i);
    expect(() => relativeLuminance('#FFF')).toThrow(/hex/i);
    expect(() => contrastRatio('#FFFFFF', 'white')).toThrow(/hex/i);
  });

  it('matches the WCAG reference value for a known pair', () => {
    // #767676 on white is the canonical "exactly AA" grey: 4.54:1.
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2);
  });
});

describe.each(themes)('%s theme', (_name, palette) => {
  it.each(TEXT_ON_SURFACES)('%s on %s is readable text', (foreground, background) => {
    expect(contrastRatio(palette[foreground], palette[background])).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(SEMANTIC_TEXT)('%s on %s is readable text', (foreground, background) => {
    expect(contrastRatio(palette[foreground], palette[background])).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(GRAPHICS)('%s on %s is a distinguishable graphic', (foreground, background) => {
    expect(contrastRatio(palette[foreground], palette[background])).toBeGreaterThanOrEqual(
      AA_NON_TEXT,
    );
  });

  it.each(CONTROL_OUTLINES)('%s on %s identifies a control', (foreground, background) => {
    expect(contrastRatio(palette[foreground], palette[background])).toBeGreaterThanOrEqual(
      AA_NON_TEXT,
    );
  });

  it('keeps every syntax colour readable on the code surface', () => {
    // The code block stays dark in both themes, so this runs twice against the same target —
    // deliberately, because a future light code surface would have to pass here too.
    for (const [token, colour] of Object.entries(syntaxPalette)) {
      expect(
        meetsContrast(colour, palette.codeBackground, AA_TEXT) ? token : `${token} too faint`,
      ).toBe(token);
    }
  });

  it('keeps inverse text readable on primary text, as used by toasts', () => {
    expect(contrastRatio(palette.textInverse, palette.textPrimary)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

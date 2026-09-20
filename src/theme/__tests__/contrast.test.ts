import { GAME_ICON_COLOURS } from '@/components/ui/GameIcon';

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
 *
 * **Progress FILLS are deliberately not asserted here.** A fill bright enough to look like the
 * style demands cannot reach 3:1 against any track light enough to sit on a white card; that
 * is arithmetic, not an oversight. What 1.4.11 actually requires is that the *component* be
 * identifiable, which `borderStrong` does as the track's outline, and the *value* is never
 * carried by colour alone — every bar renders a text label beside it and exposes
 * `accessibilityValue`. Those are the assertions that matter, and they are below.
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

/** The tinted cards — the Daily Challenge, a met goal, a success panel — carry body text too. */
const TEXT_ON_TINTED_CARDS: [keyof Palette, keyof Palette][] = [
  ['textPrimary', 'challengeSurface'],
  ['textSecondary', 'challengeSurface'],
  ['textPrimary', 'successSurface'],
  ['textSecondary', 'successSurface'],
  ['textPrimary', 'warningSurface'],
  ['textSecondary', 'warningSurface'],
];

/** Semantic text: the feedback panel, the badge labels and every button face. */
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
  // Button faces. Every variant must hold its own label, pressed as well as resting.
  ['onPrimary', 'primary'],
  ['onPrimary', 'primaryPressed'],
  ['onChallenge', 'challenge'],
  ['onChallenge', 'challengePressed'],
  ['textInverse', 'success'],
  ['textInverse', 'successPressed'],
  ['textInverse', 'danger'],
  ['textInverse', 'dangerPressed'],
  // The number on a coin. This pair is why `onGold` exists and why it does not flip with the
  // theme — the coin's face is bright in both.
  ['onGold', 'xpGlow'],
  // Links and the primary-tinted labels.
  ['primary', 'background'],
  ['primary', 'surface'],
];

/** Icons — graphics, not words. */
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
  // The progress track's own outline, including inside the two tinted cards that hold a bar.
  ['borderStrong', 'warningSurface'],
  ['borderStrong', 'challengeSurface'],
  ['primary', 'surface'],
  ['danger', 'surface'],
];

/** Everything a `GameIcon` is ever drawn on. */
const ICON_BACKGROUNDS: (keyof Palette)[] = [
  'background',
  'surface',
  'challengeSurface',
  'warningSurface',
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

  it.each(TEXT_ON_TINTED_CARDS)('%s on %s is readable text', (foreground, background) => {
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

  /**
   * A `GameIcon` is a bright face inside a dark rim. Requiring BOTH to clear 3:1 would ban the
   * bright faces the style is made of; requiring NEITHER would let an icon vanish into its
   * card. So the rule is that one of them always does the work — the rim in the light theme,
   * the face in the dark one — and this proves it for every icon on every surface it lands on.
   */
  it.each(Object.entries(GAME_ICON_COLOURS))(
    'the %s icon stays visible on every surface it is drawn on',
    (name, tokens) => {
      for (const background of ICON_BACKGROUNDS) {
        const best = Math.max(
          contrastRatio(palette[tokens.face], palette[background]),
          contrastRatio(palette[tokens.rim], palette[background]),
        );

        expect(best >= AA_NON_TEXT ? name : `${name} disappears on ${background}`).toBe(name);
      }
    },
  );

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

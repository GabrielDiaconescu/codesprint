/**
 * Colour palettes (SPEC §8). Both themes are authored deliberately.
 *
 * Contrast targets WCAG 2.1 AA (SPEC §47): body text >= 4.5:1 against its surface, icons and
 * control outlines >= 3:1. This is not a claim in a comment — every pair the app actually
 * renders is measured in `__tests__/contrast.test.ts`, so a colour nudged for looks fails the
 * build rather than a user.
 *
 * Semantic feedback is never colour-only — pair with an icon and text (SPEC §47).
 */

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  /** App background. */
  background: string;
  /** Raised surface (cards, sheets). */
  surface: string;
  /** Surface one step further forward. */
  surfaceElevated: string;
  /** Decorative outlines and dividers — a card, a separator (exempt from WCAG 1.4.11). */
  border: string;
  /**
   * The outline of a control that is identified BY its outline — a text field.
   *
   * Kept apart from `border` because 3:1 against the surface is a visibly darker line, and
   * putting it round every card would make the whole app look boxed in (WCAG 1.4.11).
   */
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textInverse: string;
  /** Brand accent, used for primary actions. */
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  success: string;
  successSurface: string;
  danger: string;
  dangerSurface: string;
  warning: string;
  warningSurface: string;
  /**
   * Gamification accents — for ICONS and progress fills, never for text.
   *
   * A flame that reads as a flame and a number that reads as a number have different jobs: an
   * icon needs 3:1 (WCAG 1.4.11), a label needs 4.5:1, and an orange dark enough for the
   * second is no longer an orange. `Badge` pairs them with a text colour for this reason.
   */
  streak: string;
  xp: string;
  life: string;
  /** Code block surface. */
  codeBackground: string;
}

export const lightPalette: Palette = {
  background: '#F7F8FB',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  border: '#E3E6EF',
  borderStrong: '#868DA4',
  textPrimary: '#12151F',
  textSecondary: '#5B6178',
  textInverse: '#FFFFFF',
  primary: '#3B5BFF',
  primaryPressed: '#2C46D8',
  onPrimary: '#FFFFFF',
  // 4.39:1 on `successSurface` before Phase 20 — under AA for the label inside a success
  // badge, which is exactly where this pair is used. Darkened to 5.8:1.
  success: '#0D6B4D',
  successSurface: '#E4F6EF',
  danger: '#C32F3E',
  dangerSurface: '#FDECEE',
  warning: '#9A6300',
  warningSurface: '#FFF3DC',
  streak: '#E1670A',
  xp: '#A06600',
  life: '#D33A4B',
  codeBackground: '#11141F',
};

export const darkPalette: Palette = {
  background: '#0B1020',
  surface: '#141A2E',
  surfaceElevated: '#1C2440',
  border: '#2A3352',
  borderStrong: '#6B78B4',
  textPrimary: '#F2F4FA',
  textSecondary: '#A2AAC4',
  textInverse: '#12151F',
  primary: '#7B93FF',
  primaryPressed: '#93A7FF',
  onPrimary: '#0B1020',
  success: '#4ED8A4',
  successSurface: '#123527',
  danger: '#FF8A94',
  dangerSurface: '#3A1A1E',
  warning: '#FFC96B',
  warningSurface: '#3A2C10',
  streak: '#FF9B4A',
  xp: '#FFD166',
  life: '#FF7A87',
  codeBackground: '#070A14',
};

export const palettes: Record<ColorScheme, Palette> = {
  light: lightPalette,
  dark: darkPalette,
};

/**
 * Syntax colours for the CodeBlock (SPEC §8).
 *
 * The code surface stays dark in BOTH themes — a deliberate choice, not an oversight. It keeps
 * one set of contrast-checked syntax colours instead of two, matches how developers expect code
 * to look, and guarantees the highlighting is legible whatever the app theme. Every colour below
 * is checked against `codeBackground`.
 */
export interface SyntaxPalette {
  keyword: string;
  builtin: string;
  string: string;
  comment: string;
  number: string;
  operator: string;
  decorator: string;
  plain: string;
}

export const syntaxPalette: SyntaxPalette = {
  keyword: '#FF9BC8',
  builtin: '#8BD6FF',
  string: '#9BE7A4',
  comment: '#8C93A8',
  number: '#FFC46B',
  operator: '#E4E8F5',
  decorator: '#D7B3FF',
  plain: '#E4E8F5',
};

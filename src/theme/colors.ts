/**
 * Colour palettes (SPEC §8). Both themes are authored deliberately.
 *
 * Contrast targets WCAG 2.1 AA (SPEC §47): body text >= 4.5:1 against its surface.
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
  border: string;
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
  /** Gamification accents. */
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
  textPrimary: '#12151F',
  textSecondary: '#5B6178',
  textInverse: '#FFFFFF',
  primary: '#3B5BFF',
  primaryPressed: '#2C46D8',
  onPrimary: '#FFFFFF',
  success: '#12805C',
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

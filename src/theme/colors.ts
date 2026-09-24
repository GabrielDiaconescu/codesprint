/**
 * Colour palettes (SPEC §8). Both themes are authored deliberately.
 *
 * The palette is loud on purpose. Saturated colour is the point of the style, and the whole
 * risk of the style is that saturated colour cannot carry small text: a golden-yellow dark
 * enough to read as a word has stopped being golden. So the palette keeps the two jobs apart.
 * A token ending in `Fill`, `Glow` or `Deep`, and the gamification accents, are **paint** —
 * they colour a surface, a bar, an icon or a shadow, and are held to 3:1 (WCAG 1.4.11). Every
 * other colour may end up under a word and is held to 4.5:1 (1.4.3).
 *
 * This is not a claim in a comment — every pair the app actually renders is measured in
 * `__tests__/contrast.test.ts`, so a colour nudged for looks fails the build rather than a
 * user.
 *
 * Semantic feedback is never colour-only — pair with an icon and text (SPEC §47).
 */

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  /** App background. Warm, so the white cards read as objects lying on it (SPEC §8). */
  background: string;
  /** Raised surface (cards, sheets). */
  surface: string;
  /** Surface one step further forward. */
  surfaceElevated: string;
  /** The rim under a light surface that is pressable — see `depth` in the tokens. */
  surfaceDeep: string;
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
  /** Brand accent and primary actions. Vivid, and still able to carry white text. */
  primary: string;
  primaryPressed: string;
  /** The rim under a primary button. Paint, never text. */
  primaryDeep: string;
  onPrimary: string;
  /** Readable green — success labels and captions. */
  success: string;
  successPressed: string;
  /** Bright green — goal bars and success fills. Paint, never text. */
  successFill: string;
  successDeep: string;
  successSurface: string;
  danger: string;
  dangerPressed: string;
  dangerDeep: string;
  dangerSurface: string;
  warning: string;
  warningSurface: string;
  /**
   * The Daily Challenge's own colour (SPEC §13), because it has to contrast with `primary`
   * on the same screen — two calls to action in the same blue read as one.
   */
  challenge: string;
  challengePressed: string;
  onChallenge: string;
  challengeDeep: string;
  challengeSurface: string;
  /**
   * Gamification accents — for ICONS and progress fills, never for text.
   *
   * A flame that reads as a flame and a number that reads as a number have different jobs: an
   * icon needs 3:1 (WCAG 1.4.11), a label needs 4.5:1, and an orange dark enough for the
   * second is no longer an orange. `Badge` pairs them with a text colour for this reason.
   */
  streak: string;
  /** The deep gold that gives a coin its edge — this is the part held to 3:1. */
  xp: string;
  /** The bright gold face of a coin, always drawn inside an `xp` rim. */
  xpGlow: string;
  /**
   * Ink for text drawn ON `xpGlow` — the number on a coin.
   *
   * It is dark in BOTH themes, because the coin's face is bright in both. This is the one
   * colour in the palette that does not flip with the scheme, and it is deliberately not
   * reused on `warningSurface`, which does flip.
   */
  onGold: string;
  life: string;
  /** Code block surface. */
  codeBackground: string;
  /**
   * The chip behind `inline code` in prose, drawn in `textPrimary`. Not `codeBackground`: that
   * is dark in both themes, and in the light theme it turned every `+` into a black box.
   */
  inlineCode: string;
}

export const lightPalette: Palette = {
  background: '#FBF6EC',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceDeep: '#E0D8C8',
  border: '#E6DFD2',
  borderStrong: '#7D849C',
  textPrimary: '#2B2438',
  textSecondary: '#5C5470',
  textInverse: '#FFFFFF',
  // 5.2:1 against white in both directions, which is the whole trick: the same blue can be a
  // button fill under white text AND a link on a white card. A brighter sky blue can do
  // neither.
  primary: '#1C5FF5',
  primaryPressed: '#1650D6',
  primaryDeep: '#0A3BB5',
  onPrimary: '#FFFFFF',
  success: '#0D6B4D',
  successPressed: '#0A5537',
  successFill: '#16A85B',
  successDeep: '#0A5537',
  successSurface: '#E3F7EC',
  danger: '#C32F3E',
  dangerPressed: '#91222E',
  dangerDeep: '#91222E',
  dangerSurface: '#FDECEE',
  warning: '#9A6300',
  warningSurface: '#FFF3DC',
  // Deep enough to hold white text at 4.9:1 while still reading as fire next to the blue.
  challenge: '#C94400',
  challengePressed: '#A63800',
  onChallenge: '#FFFFFF',
  challengeDeep: '#8F2F00',
  challengeSurface: '#FFEFDC',
  streak: '#E85D04',
  xp: '#B87400',
  xpGlow: '#FFC93C',
  onGold: '#3D2A00',
  life: '#E8394B',
  codeBackground: '#11141F',
  inlineCode: '#E0D8C8',
};

/**
 * Dark mode is authored, not inverted (SPEC §8).
 *
 * The 3D treatment has to be rebuilt rather than reused: a dark rim under a dark button is
 * invisible, so in this theme raised things get a lighter face and the rim is the dark one,
 * which is how a physical object looks lit from above in a dim room. For the same reason a
 * pressed face here goes **lighter**, not darker: the ink on these buttons is dark, and
 * darkening the face on press would have made every held button unreadable — which is the
 * defect the contrast test caught when the light theme's shades were reused here. The background is a deep
 * violet rather than a neutral slate, because the warmth is what stops the style reading as a
 * developer tool at night.
 */
export const darkPalette: Palette = {
  background: '#151226',
  surface: '#221C3A',
  surfaceElevated: '#2C2450',
  surfaceDeep: '#100D1F',
  border: '#3A3160',
  borderStrong: '#8B84C4',
  textPrimary: '#F6F2FF',
  textSecondary: '#B3ACD4',
  textInverse: '#1A1430',
  primary: '#6E8CFF',
  primaryPressed: '#8AA2FF',
  primaryDeep: '#31408F',
  onPrimary: '#14112A',
  success: '#4FE0A8',
  successPressed: '#7BEBC0',
  successFill: '#2FD47E',
  successDeep: '#146B45',
  successSurface: '#10412F',
  danger: '#FF8A94',
  dangerPressed: '#FFB2B9',
  dangerDeep: '#7E2B34',
  dangerSurface: '#45202A',
  warning: '#FFC96B',
  warningSurface: '#45351A',
  challenge: '#FF8A3D',
  challengePressed: '#FFA467',
  onChallenge: '#2A1405',
  challengeDeep: '#8F4413',
  challengeSurface: '#3D2411',
  streak: '#FF8A3D',
  xp: '#E8A73C',
  xpGlow: '#FFD96B',
  onGold: '#2A1F05',
  life: '#FF7A87',
  codeBackground: '#070A14',
  inlineCode: '#2C2450',
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

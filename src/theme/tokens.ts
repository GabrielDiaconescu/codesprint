/**
 * Design tokens (SPEC §8).
 *
 * Values only — no component imports them directly except through the theme, so a token
 * change propagates everywhere at once.
 *
 * Dark mode is designed intentionally, not inverted (SPEC §8).
 */

import { fontFamily } from './fonts';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/**
 * Corner radii (SPEC §8).
 *
 * Deliberately exaggerated. A 6pt corner is a document; an 18pt corner on the same box is an
 * object you could pick up, and every element in this style is meant to look pickable.
 */
export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

/**
 * Type scale (SPEC §8).
 *
 * Weight is carried by `fontFamily`, not `fontWeight`: on Android a numeric weight applied to
 * a named font file is ignored, which silently loses the intended hierarchy. Line heights are
 * absolute so dynamic font scaling stays predictable (SPEC §47).
 *
 * `score` is for numbers that are meant to feel earned — an XP total, a level, a streak count.
 * It is the only variant set in Black, and using it for prose would be shouting.
 */
export const typography = {
  score: { fontSize: 34, lineHeight: 40, fontFamily: fontFamily.heavy },
  display: { fontSize: 32, lineHeight: 40, fontFamily: fontFamily.bold },
  title: { fontSize: 25, lineHeight: 32, fontFamily: fontFamily.bold },
  heading: { fontSize: 20, lineHeight: 27, fontFamily: fontFamily.bold },
  subheading: { fontSize: 17, lineHeight: 24, fontFamily: fontFamily.semibold },
  body: { fontSize: 16, lineHeight: 24, fontFamily: fontFamily.regular },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontFamily: fontFamily.semibold },
  bodySmall: { fontSize: 14, lineHeight: 20, fontFamily: fontFamily.regular },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.medium },
  /** Small, and shouty on purpose — button labels and pill text. */
  label: { fontSize: 13, lineHeight: 17, fontFamily: fontFamily.bold },
  mono: { fontSize: 14, lineHeight: 21, fontFamily: fontFamily.mono },
  monoSmall: { fontSize: 12, lineHeight: 18, fontFamily: fontFamily.mono },
} as const;

/** Motion durations in ms. Every animation must honour OS reduce-motion (SPEC §8, §47). */
export const motion = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

/** Minimum touch target: 44pt iOS / 48dp Android (SPEC §47). */
export const a11y = {
  minTouchTarget: 48,
} as const;

/**
 * Rim heights for the 3D treatment (SPEC §8).
 *
 * This is the one idea the whole style rests on, so it is worth being precise about. A raised
 * element is drawn as two stacked boxes: a `Deep` coloured box behind, offset downwards by the
 * number below, and the real face on top of it. Pressing translates the face down by exactly
 * that number, so the rim disappears and the object looks pushed into the page.
 *
 * It is a hard-edged offset, not a blurred shadow: a blur reads as a floating card, an offset
 * reads as a solid thing with a side.
 */
export const depth = {
  none: 0,
  /** Cards and static surfaces. */
  raised: 3,
  /** Buttons and anything else meant to look pressable. */
  press: 5,
  /** The primary call to action on a screen. */
  pressLarge: 7,
} as const;

/** Legacy blurred elevation, still used by sheets and the toast host. */
export const elevation = {
  none: 0,
  low: 2,
  medium: 6,
  high: 12,
} as const;

/**
 * Applied to a pressed surface that is NOT 3D — a list row, a plain card.
 *
 * Anything with a rim uses `depth` instead: dimming a button that is already travelling
 * downwards reads as a disabled control rather than a pressed one.
 */
export const pressed = { opacity: 0.7, scale: 0.98 } as const;

export type Spacing = keyof typeof spacing;
export type Radius = keyof typeof radius;
export type TypographyVariant = keyof typeof typography;
export type Depth = keyof typeof depth;

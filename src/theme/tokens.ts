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

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/**
 * Type scale (SPEC §8).
 *
 * Weight is carried by `fontFamily`, not `fontWeight`: on Android a numeric weight applied to
 * a named font file is ignored, which silently loses the intended hierarchy. Line heights are
 * absolute so dynamic font scaling stays predictable (SPEC §47).
 */
export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontFamily: fontFamily.bold },
  title: { fontSize: 24, lineHeight: 30, fontFamily: fontFamily.bold },
  heading: { fontSize: 20, lineHeight: 26, fontFamily: fontFamily.semibold },
  subheading: { fontSize: 17, lineHeight: 24, fontFamily: fontFamily.semibold },
  body: { fontSize: 16, lineHeight: 24, fontFamily: fontFamily.regular },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontFamily: fontFamily.semibold },
  bodySmall: { fontSize: 14, lineHeight: 20, fontFamily: fontFamily.regular },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.medium },
  label: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.semibold },
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

export const elevation = {
  none: 0,
  low: 2,
  medium: 6,
  high: 12,
} as const;

/** Opacity applied to a pressed surface, so every component reacts identically. */
export const pressed = { opacity: 0.7, scale: 0.98 } as const;

export type Spacing = keyof typeof spacing;
export type Radius = keyof typeof radius;
export type TypographyVariant = keyof typeof typography;

/**
 * Design tokens (SPEC §8).
 *
 * Phase 1 defines the token VALUES only. The component library that consumes them
 * (buttons, cards, progress rings, CodeBlock, feedback panel) is Phase 2.
 *
 * Dark mode is designed intentionally, not inverted (SPEC §8).
 */

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

/** Type scale. `lineHeight` is absolute so dynamic font scaling stays predictable (SPEC §47). */
export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  mono: { fontSize: 14, lineHeight: 21, fontWeight: '400' },
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

export type Spacing = keyof typeof spacing;
export type Radius = keyof typeof radius;
export type TypographyVariant = keyof typeof typography;

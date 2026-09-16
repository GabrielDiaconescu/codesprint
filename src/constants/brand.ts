/**
 * The single source of truth for the product name and taglines (SPEC §9).
 *
 * A rename must be a one-line change here (plus i18n copy and store assets).
 * Nothing else in the codebase may hardcode the product name.
 *
 * NOTE: "CodeSprint" is a WORKING NAME. Name clearance is a launch blocker (SPEC §0.3, H1).
 */
export const BRAND = {
  /** Short product name, used in-app. */
  name: 'CodeSprint',
  /** App Store / Google Play listing title. */
  storeTitle: 'CodeSprint: Learn to Code',
  /** Main tagline. */
  tagline: 'Learn to Code. 5 Minutes a Day.',
  /** Short promotional line. */
  promoLine: 'Bite-sized lessons. Daily challenges. Real coding progress.',
  /** Support + legal surfaces (resolved from env at runtime, see src/lib/env.ts). */
  supportEmail: 'support@codesprint.app',
} as const;

export type Brand = typeof BRAND;

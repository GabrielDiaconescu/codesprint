import type { ColorScheme } from '@/theme';

/**
 * The pure rules behind Home's header (SPEC §13).
 *
 * Small decisions, but each one is the kind that goes wrong silently in a component: a
 * greeting that renders "Hello !", a language toggle that toggles nothing, a theme button that
 * appears to do the opposite of what it says. They live here so they can be asserted.
 */

export type Greeting = { key: 'greeting.named'; name: string } | { key: 'greeting.anonymous' };

/**
 * Which greeting to render.
 *
 * Guest mode is on by default (D1), and a guest has no display name — neither does a brand-new
 * account before the profile step. Both cases must produce a warm sentence rather than a gap,
 * so the name-free variant is a separate i18n key and not the same string with an empty
 * interpolation (SPEC §38: no user-facing text is built by concatenation).
 */
export const greeting = (displayName: string | null | undefined): Greeting => {
  const name = displayName?.trim();
  return name ? { key: 'greeting.named', name } : { key: 'greeting.anonymous' };
};

/**
 * Whether the language toggle is shown at all (SPEC §29, §38).
 *
 * English is the only locale at launch, and a control that cannot change anything is worse
 * than no control. Deriving this from the shipped resources rather than a flag means the
 * toggle appears on the day a second locale is added and not a release later.
 */
export const showLanguageToggle = (locales: readonly string[]): boolean => locales.length > 1;

/**
 * The next locale in the cycle.
 *
 * Cycles rather than flipping, so a third language does not need a different control. An
 * unknown current locale starts the cycle from the beginning instead of throwing.
 */
export const nextLocale = (current: string, locales: readonly string[]): string => {
  if (locales.length === 0) return current;
  const index = locales.indexOf(current);
  return locales[(index + 1) % locales.length] ?? current;
};

/**
 * What the theme button does.
 *
 * It takes the **resolved** scheme, not the preference, so a user following the system at
 * night gets "light" from a sun icon rather than a no-op that sets `light` while the system
 * already resolved to light. Tapping it always leaves the preference explicit.
 */
export const nextScheme = (resolved: ColorScheme): ColorScheme =>
  resolved === 'dark' ? 'light' : 'dark';

/**
 * A score a human reads at a glance.
 *
 * Guarded: Hermes ships Intl, but a device with a broken locale database must not turn Home
 * into a red screen over a thousands separator (SPEC §46).
 */
export const formatScore = (value: number, locale?: string): string => {
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch {
    return String(value);
  }
};

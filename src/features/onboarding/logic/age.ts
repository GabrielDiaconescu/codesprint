/**
 * The age gate (SPEC §11, §41, D10).
 *
 * This MIRRORS `public.age_from_birth_year` and the thresholds in `app_config`. The server is
 * the authority — it re-checks the age and forces the minor defaults whatever the client
 * sends — but the client needs the same answer to decide which screen to show.
 *
 * SPEC §11 collects the birth YEAR only, never a full date, because a year is enough for an
 * age gate and a date is more personal data than the product needs. The cost is a ±1 year
 * window: someone born in 2013 is 12 or 13 during 2026 depending on their birthday. Both
 * sides resolve it the same way — the age you reach during the current year — so the boundary
 * is "the year you turn 13", not "your thirteenth birthday".
 */

export type AgeVerdict = 'too-young' | 'protected-minor' | 'adult';

export interface AgeThresholds {
  minUserAge: number;
  minorProtectionAge: number;
}

/** The oldest birth year we will accept. Beyond this the input is a typo, not a person. */
export const MAX_PLAUSIBLE_AGE = 120;

export const ageFromBirthYear = (birthYear: number, now: Date = new Date()): number =>
  now.getFullYear() - birthYear;

export type BirthYearProblem = 'required' | 'not-a-year' | 'in-the-future' | 'implausible';

/**
 * Validates the raw input before any age decision is made.
 *
 * Kept separate from the verdict on purpose: "2O26" with a letter O and "2030" are input
 * errors the user should fix, whereas being 12 is not an error and must not be phrased as one.
 */
export const validateBirthYear = (raw: string, now: Date = new Date()): BirthYearProblem | null => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return 'required';
  if (!/^\d{4}$/.test(trimmed)) return 'not-a-year';

  const year = Number.parseInt(trimmed, 10);
  if (year > now.getFullYear()) return 'in-the-future';
  if (ageFromBirthYear(year, now) > MAX_PLAUSIBLE_AGE) return 'implausible';

  return null;
};

export const classifyAge = (
  birthYear: number,
  { minUserAge, minorProtectionAge }: AgeThresholds,
  now: Date = new Date(),
): AgeVerdict => {
  const age = ageFromBirthYear(birthYear, now);
  if (age < minUserAge) return 'too-young';
  if (age < minorProtectionAge) return 'protected-minor';
  return 'adult';
};

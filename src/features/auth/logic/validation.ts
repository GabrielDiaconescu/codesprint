/**
 * Credential validation (SPEC §12, §46).
 *
 * These rules MIRROR the server: `minimum_password_length = 8` and
 * `password_requirements = "letters_digits"` in `supabase/config.toml`. They are duplicated
 * on purpose — the client copy exists to give an answer without a round trip, not to be the
 * authority. If the two ever drift, the server wins and the user sees a confusing rejection,
 * so `authRules.test.ts` pins the constants against the config file.
 */

export const MIN_PASSWORD_LENGTH = 8;

export type EmailProblem = 'required' | 'invalid';
export type PasswordProblem = 'required' | 'too-short' | 'needs-letter-and-digit';

/**
 * Addresses are compared case-insensitively by the provider, and mobile keyboards love to
 * capitalise the first letter. Normalising before sending avoids "no account found" for
 * someone who typed their own address correctly.
 */
export const normalizeEmail = (raw: string): string => raw.trim().toLowerCase();

/**
 * Deliberately permissive. A strict RFC 5322 pattern rejects valid addresses, and the only
 * real proof an address works is the confirmation email we are about to send. This catches
 * typos, not exotic syntax.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const validateEmail = (raw: string): EmailProblem | null => {
  const email = normalizeEmail(raw);
  if (email.length === 0) return 'required';
  return EMAIL_PATTERN.test(email) ? null : 'invalid';
};

export const validatePassword = (raw: string): PasswordProblem | null => {
  if (raw.length === 0) return 'required';
  if (raw.length < MIN_PASSWORD_LENGTH) return 'too-short';
  // Matches the provider's `letters_digits` requirement exactly.
  if (!/\p{L}/u.test(raw) || !/\d/.test(raw)) return 'needs-letter-and-digit';
  return null;
};

/** True when both fields are acceptable — the gate for enabling a submit button. */
export const canSubmitCredentials = (email: string, password: string): boolean =>
  validateEmail(email) === null && validatePassword(password) === null;

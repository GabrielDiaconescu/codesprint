import type { DisplayNameProblem } from '@/services';

/**
 * A first opinion on a display name, while the user is still typing (SPEC §26, §46).
 *
 * The SERVER is the authority. It re-runs every rule in `display_name_problem`, and the
 * blocklists live in `app_config` where they can be changed without shipping an app update —
 * which is exactly why they are not duplicated here.
 *
 * What is duplicated is the part that never changes and that a user should not have to wait
 * for a round trip to learn: length, and the character set. Getting "too short" the instant
 * you type two letters is worth the twelve lines; getting it after a network call is not.
 *
 * `\p{L}` and `\p{N}` mirror the database's locale-aware `[[:alnum:]]`, so "Mărioară" and
 * "Δημήτρης" pass here exactly as they do there.
 */

export const DISPLAY_NAME_MIN = 3;
export const DISPLAY_NAME_MAX = 20;

const SHAPE = /^[\p{L}\p{N}][\p{L}\p{N} _.-]*[\p{L}\p{N}]$/u;

export const localDisplayNameProblem = (raw: string): DisplayNameProblem | null => {
  const name = raw.trim();

  if (name.length === 0) return 'required';
  if ([...name].length < DISPLAY_NAME_MIN) return 'too_short';
  if ([...name].length > DISPLAY_NAME_MAX) return 'too_long';
  if (!SHAPE.test(name)) return 'invalid_characters';

  return null;
};

/** Whether the Save button should be enabled at all. */
export const canSubmitDisplayName = (raw: string, current: string | null): boolean =>
  localDisplayNameProblem(raw) === null && raw.trim() !== (current ?? '');

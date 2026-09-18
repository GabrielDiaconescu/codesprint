import { DISPLAY_NAME_PROBLEMS, type DisplayNameProblem } from './schema';

/**
 * Turning a PostgREST failure into the vocabulary the display-name screen speaks (SPEC §46).
 *
 * `set_display_name` raises `22023` with the message `display name rejected: <code>`, where
 * the code is the one `display_name_problem` produced, or `23505` when the name is taken.
 * Parsing the suffix rather than the whole message means the English prose around it can
 * change freely; only the code is a contract.
 *
 * A pure function over a duck-typed shape, for the same reasons as `toAuthErrorCode`: it is
 * testable without a network or a Supabase import, and the failure that matters most on a
 * train is a fetch error, which is not a PostgREST error at all.
 */

interface ErrorLike {
  code?: unknown;
  message?: unknown;
}

const REJECTION_PREFIX = 'display name rejected: ';

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const isKnownProblem = (value: string): value is DisplayNameProblem =>
  (DISPLAY_NAME_PROBLEMS as readonly string[]).includes(value);

export const toDisplayNameProblem = (error: unknown): DisplayNameProblem => {
  if (error === null || typeof error !== 'object') return 'unknown';

  const candidate = error as ErrorLike;
  const code = asString(candidate.code);

  if (code === '23505') return 'taken';

  if (code === '22023') {
    const message = asString(candidate.message);
    const index = message.indexOf(REJECTION_PREFIX);
    if (index !== -1) {
      const problem = message.slice(index + REJECTION_PREFIX.length).trim();
      if (isKnownProblem(problem)) return problem;
    }
    // A 22023 we do not recognise is still the server refusing the name, not a crash.
    return 'invalid_characters';
  }

  return 'unknown';
};

export class DisplayNameRejected extends Error {
  constructor(
    public readonly problem: DisplayNameProblem,
    /** Kept for monitoring only — never shown to a user. */
    public override readonly cause?: unknown,
  ) {
    super(`display name rejected: ${problem}`);
    this.name = 'DisplayNameRejected';
  }
}

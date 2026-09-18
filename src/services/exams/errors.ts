import { EXAM_UNAVAILABLE_REASONS, type ExamUnavailableReason } from './schema';

/**
 * Turning a refusal from `start_exam` into the vocabulary the exam screen speaks (SPEC §46).
 *
 * The server raises `exam unavailable: <code>`, where the code is the one
 * `exam_unavailable_reason` produced — the same code `get_exam_overview` already put on the
 * card. Parsing the suffix rather than the whole message keeps the English prose around it
 * free to change; only the code is a contract.
 *
 * A pure function over a duck-typed shape, for the same reason as the other two mappers in
 * this codebase: it is testable without a network or a Supabase import, and the failure that
 * matters most on a train is a fetch error, which carries no PostgREST code at all.
 */

interface ErrorLike {
  code?: unknown;
  message?: unknown;
}

const PREFIX = 'exam unavailable: ';

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const isKnownReason = (value: string): value is ExamUnavailableReason =>
  (EXAM_UNAVAILABLE_REASONS as readonly string[]).includes(value);

export const toExamUnavailableReason = (error: unknown): ExamUnavailableReason => {
  if (error === null || typeof error !== 'object') return 'unknown';

  const candidate = error as ErrorLike;
  const message = asString(candidate.message);
  const index = message.indexOf(PREFIX);

  if (index !== -1) {
    const reason = message.slice(index + PREFIX.length).trim();
    if (isKnownReason(reason)) return reason;
  }

  // No code in the message, but the status still says which kind of refusal it was.
  const code = asString(candidate.code);
  if (code === '42501') return 'requires_premium';
  if (code === 'P0002') return 'not_found';

  return 'unknown';
};

export class ExamUnavailable extends Error {
  constructor(
    public readonly reason: ExamUnavailableReason,
    /** Kept for monitoring only — never shown to a learner. */
    public override readonly cause?: unknown,
  ) {
    super(`exam unavailable: ${reason}`);
    this.name = 'ExamUnavailable';
  }
}

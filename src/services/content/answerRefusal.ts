import type { AnswerRefusalReason } from '../types';

/**
 * The server's two refusals of an answer, by SQLSTATE (migration
 * `20260924100000_lives_gate_and_rate_limits.sql`). The codes are the contract; the message
 * around them is free to change.
 *
 * Pure and duck-typed, like the other error mappers here: testable without a network, and a
 * fetch failure — no code at all — correctly maps to "not a refusal".
 */
export const toAnswerRefusal = (error: unknown): AnswerRefusalReason | null => {
  if (error === null || typeof error !== 'object') return null;

  const code = (error as { code?: unknown }).code;
  if (code === 'LV000') return 'out-of-lives';
  if (code === 'RL000') return 'rate-limited';
  return null;
};

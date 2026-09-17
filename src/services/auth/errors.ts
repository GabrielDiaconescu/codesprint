import type { AuthErrorCode } from '../types';

/**
 * Translating provider failures into our own vocabulary (SPEC §46).
 *
 * This is deliberately a pure function over a duck-typed shape rather than a `instanceof
 * AuthError` check. Two reasons:
 *
 *   * it keeps the SDK out of the signature, so the mapping is unit-testable without a
 *     network, a client, or any Supabase import at all;
 *   * the thing thrown by a fetch failure is NOT an AuthError — it is a TypeError from the
 *     runtime — and that case matters most, because it is the one users hit on a train.
 *
 * Anything unrecognised becomes 'unknown', which the UI renders as a generic message with a
 * retry. It never renders `error.message`: those strings are English-only and occasionally
 * leak implementation detail.
 */

export class AuthFailure extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    /** Kept for monitoring only — never shown to a user. */
    public override readonly cause?: unknown,
  ) {
    super(`auth failed: ${code}`);
    this.name = 'AuthFailure';
  }
}

/** The subset of a provider error we are willing to depend on. */
interface ErrorLike {
  code?: unknown;
  status?: unknown;
  name?: unknown;
  message?: unknown;
}

const CODE_MAP: Record<string, AuthErrorCode> = {
  invalid_credentials: 'invalid-credentials',
  invalid_grant: 'invalid-credentials',
  email_not_confirmed: 'email-not-confirmed',
  user_already_exists: 'email-taken',
  email_exists: 'email-taken',
  identity_already_exists: 'email-taken',
  weak_password: 'weak-password',
  same_password: 'same-password',
  over_email_send_rate_limit: 'rate-limited',
  over_request_rate_limit: 'rate-limited',
  over_sms_send_rate_limit: 'rate-limited',
  otp_expired: 'expired-link',
  flow_state_expired: 'expired-link',
  flow_state_not_found: 'expired-link',
  bad_code_verifier: 'expired-link',
  anonymous_provider_disabled: 'guest-disabled',
  signup_disabled: 'guest-disabled',
};

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

/**
 * Network detection is by necessity message-based: fetch failures surface differently on
 * iOS, Android and Node, and none of them carry a machine-readable code.
 */
const isNetworkFailure = (error: ErrorLike): boolean => {
  const name = asString(error.name);
  if (name === 'AuthRetryableFetchError') return true;

  const message = asString(error.message).toLowerCase();
  return (
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('network error')
  );
};

export const toAuthErrorCode = (error: unknown): AuthErrorCode => {
  if (error === null || typeof error !== 'object') return 'unknown';

  const candidate = error as ErrorLike;

  const mapped = CODE_MAP[asString(candidate.code)];
  if (mapped) return mapped;

  if (isNetworkFailure(candidate)) return 'network';

  // Older releases and some endpoints report only an HTTP status.
  if (candidate.status === 429) return 'rate-limited';
  if (candidate.status === 422) return 'weak-password';

  return 'unknown';
};

/** Wraps anything thrown by the provider into our own typed failure. */
export const toAuthFailure = (error: unknown): AuthFailure =>
  error instanceof AuthFailure ? error : new AuthFailure(toAuthErrorCode(error), error);

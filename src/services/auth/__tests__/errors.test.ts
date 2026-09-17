import { AuthFailure, toAuthErrorCode, toAuthFailure } from '../errors';

/**
 * The mapping decides what the user is told when something goes wrong, so a gap here shows up
 * as a screen that says "something went wrong" while the real cause was actionable — a wrong
 * password, an expired link, or no signal (SPEC §46).
 */
describe('toAuthErrorCode', () => {
  it.each([
    ['invalid_credentials', 'invalid-credentials'],
    ['invalid_grant', 'invalid-credentials'],
    ['email_not_confirmed', 'email-not-confirmed'],
    ['user_already_exists', 'email-taken'],
    ['email_exists', 'email-taken'],
    ['identity_already_exists', 'email-taken'],
    ['weak_password', 'weak-password'],
    ['same_password', 'same-password'],
    ['over_email_send_rate_limit', 'rate-limited'],
    ['over_request_rate_limit', 'rate-limited'],
    ['otp_expired', 'expired-link'],
    ['flow_state_expired', 'expired-link'],
    ['flow_state_not_found', 'expired-link'],
    ['bad_code_verifier', 'expired-link'],
    ['anonymous_provider_disabled', 'guest-disabled'],
    ['signup_disabled', 'guest-disabled'],
  ])('maps provider code %s to %s', (providerCode, expected) => {
    expect(toAuthErrorCode({ code: providerCode })).toBe(expected);
  });

  describe('network failures', () => {
    // These are the most common real-world failure and the one the provider describes worst:
    // there is no machine-readable code, only a message that differs per platform.
    it.each([
      ['React Native fetch', { message: 'Network request failed' }],
      ['browser/Node fetch', { message: 'Failed to fetch' }],
      ['generic', { message: 'A network error occurred' }],
      ['retryable auth error', { name: 'AuthRetryableFetchError', message: 'whatever' }],
    ])('detects %s', (_label, error) => {
      expect(toAuthErrorCode(error)).toBe('network');
    });

    it('is case-insensitive about the message', () => {
      expect(toAuthErrorCode({ message: 'NETWORK REQUEST FAILED' })).toBe('network');
    });
  });

  describe('status-only errors', () => {
    it('treats 429 as rate limiting', () => {
      expect(toAuthErrorCode({ status: 429 })).toBe('rate-limited');
    });

    it('treats 422 as a weak password', () => {
      expect(toAuthErrorCode({ status: 422 })).toBe('weak-password');
    });

    it('prefers an explicit code over the status', () => {
      expect(toAuthErrorCode({ code: 'invalid_credentials', status: 429 })).toBe(
        'invalid-credentials',
      );
    });
  });

  describe('anything else', () => {
    it.each([null, undefined, 'a string', 42, [], {}, { code: 'brand_new_code' }])(
      'falls back to unknown for %p',
      (input) => {
        expect(toAuthErrorCode(input)).toBe('unknown');
      },
    );

    it('does not treat a non-string code as a lookup key', () => {
      expect(toAuthErrorCode({ code: { toString: () => 'invalid_credentials' } })).toBe('unknown');
    });
  });
});

describe('toAuthFailure', () => {
  it('wraps a provider error and keeps the cause for monitoring', () => {
    const original = { code: 'invalid_credentials', message: 'Invalid login credentials' };
    const failure = toAuthFailure(original);

    expect(failure).toBeInstanceOf(AuthFailure);
    expect(failure.code).toBe('invalid-credentials');
    expect(failure.cause).toBe(original);
  });

  it('never double-wraps', () => {
    const failure = new AuthFailure('network');
    expect(toAuthFailure(failure)).toBe(failure);
  });

  it('does not leak the provider message into the thrown message', () => {
    // The UI must render an i18n key chosen from `code`, never this string.
    const failure = toAuthFailure({ code: 'weak_password', message: 'Password is too short' });
    expect(failure.message).not.toContain('too short');
  });
});

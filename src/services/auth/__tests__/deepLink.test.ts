import { interpretAuthParams, parseAuthLink } from '../deepLink';

/**
 * Deep links are an attack surface: any app on the device can fire our scheme with whatever
 * it likes (SPEC §40). These tests pin the hostile cases as much as the happy path.
 */
describe('parseAuthLink', () => {
  const code = 'abc123def456ghi789';

  it('reads a signup code from the query string', () => {
    expect(parseAuthLink(`codesprint-dev://auth-callback?flow=signup&code=${code}`)).toEqual({
      kind: 'code',
      flow: 'signup',
      code,
    });
  });

  it('reads a recovery code, whatever the parameter order', () => {
    expect(parseAuthLink(`codesprint-dev://auth-callback?code=${code}&flow=recovery`)).toEqual({
      kind: 'code',
      flow: 'recovery',
      code,
    });
  });

  it('treats a missing flow as unknown rather than guessing', () => {
    // Guessing "signup" here would silently sign in someone who asked to reset a password.
    expect(parseAuthLink(`codesprint://auth-callback?code=${code}`)).toEqual({
      kind: 'code',
      flow: 'unknown',
      code,
    });
  });

  it('ignores an unrecognised flow value', () => {
    const parsed = parseAuthLink(`codesprint://auth-callback?flow=../../admin&code=${code}`);
    expect(parsed).toEqual({ kind: 'code', flow: 'unknown', code });
  });

  describe('errors', () => {
    it('reports error_code in preference to the generic error', () => {
      const url =
        'codesprint-dev://auth-callback?error=access_denied&error_code=otp_expired' +
        '&error_description=Email+link+is+invalid+or+has+expired';
      expect(parseAuthLink(url)).toEqual({ kind: 'error', errorCode: 'otp_expired' });
    });

    it('falls back to error when there is no error_code', () => {
      expect(parseAuthLink('codesprint://auth-callback?error=access_denied')).toEqual({
        kind: 'error',
        errorCode: 'access_denied',
      });
    });

    it('reads errors delivered in the fragment', () => {
      expect(parseAuthLink('codesprint://auth-callback#error_code=otp_expired')).toEqual({
        kind: 'error',
        errorCode: 'otp_expired',
      });
    });

    it('prefers an error over a code carried on the same link', () => {
      // A link that both failed and carries a stale code must not be treated as success.
      const url = `codesprint://auth-callback?code=${code}&error_code=otp_expired`;
      expect(parseAuthLink(url)).toEqual({ kind: 'error', errorCode: 'otp_expired' });
    });

    it('rejects an implicit-flow token pair instead of half-accepting it', () => {
      const url = 'codesprint://auth-callback#access_token=xyz&refresh_token=abc';
      expect(parseAuthLink(url)).toEqual({ kind: 'error', errorCode: 'unsupported_flow' });
    });
  });

  describe('hostile and malformed input', () => {
    it.each([
      ['empty string', ''],
      ['no parameters', 'codesprint://auth-callback'],
      ['unrelated link', 'codesprint://lesson/42'],
      ['empty code', 'codesprint://auth-callback?code='],
      ['question mark only', 'codesprint://auth-callback?'],
    ])('returns none for %s', (_label, url) => {
      expect(parseAuthLink(url)).toEqual({ kind: 'none' });
    });

    it.each([
      ['too short', 'abc'],
      ['path traversal', '../../../etc/passwd'],
      ['script injection', '<script>alert(1)</script>'],
      ['sql-ish', "'; drop table users; --"],
    ])('rejects a code that is not code-shaped: %s', (_label, candidate) => {
      const url = `codesprint://auth-callback?code=${encodeURIComponent(candidate)}`;
      expect(parseAuthLink(url)).toEqual({ kind: 'none' });
    });

    it('keeps the first occurrence when a parameter is repeated', () => {
      // An appended second `code=` must not override the provider's.
      const url = `codesprint://auth-callback?code=${code}&code=attackercodeattacker`;
      expect(parseAuthLink(url)).toEqual({ kind: 'code', flow: 'unknown', code });
    });

    it('does not let the fragment overwrite a query parameter', () => {
      const url = `codesprint://auth-callback?code=${code}#code=attackercodeattacker`;
      expect(parseAuthLink(url)).toEqual({ kind: 'code', flow: 'unknown', code });
    });

    it('survives a malformed percent escape', () => {
      expect(() => parseAuthLink('codesprint://auth-callback?flow=%E0%A4%A&code=x')).not.toThrow();
    });

    // The parser is called on every incoming link, including ones meant for other features.
    it.each([null, undefined, 42, {}])('returns none for a non-string input: %p', (input) => {
      expect(parseAuthLink(input as unknown as string)).toEqual({ kind: 'none' });
    });
  });
});

/**
 * The route-params entry point is what actually runs in the app: Expo Router owns deep-link
 * routing, so the callback screen receives params, never a URL.
 */
describe('interpretAuthParams', () => {
  const code = 'abc123def456ghi789';

  it('reads a recovery code', () => {
    expect(interpretAuthParams({ flow: 'recovery', code })).toEqual({
      kind: 'code',
      flow: 'recovery',
      code,
    });
  });

  it('reports an error', () => {
    expect(interpretAuthParams({ error_code: 'otp_expired' })).toEqual({
      kind: 'error',
      errorCode: 'otp_expired',
    });
  });

  it('takes the first value when the router collapses a repeated key into an array', () => {
    expect(interpretAuthParams({ code: [code, 'attackercodeattacker'] })).toEqual({
      kind: 'code',
      flow: 'unknown',
      code,
    });
  });

  it('agrees with the URL parser on the same input', () => {
    const url = `codesprint-dev://auth-callback?flow=signup&code=${code}`;
    expect(interpretAuthParams({ flow: 'signup', code })).toEqual(parseAuthLink(url));
  });

  it.each([
    ['no params', {}],
    ['unrelated params', { lessonId: '42' }],
    ['non-string code', { code: 42 as unknown as string }],
  ])('returns none for %s', (_label, params) => {
    expect(interpretAuthParams(params)).toEqual({ kind: 'none' });
  });
});

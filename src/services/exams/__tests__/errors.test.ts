import { toExamUnavailableReason } from '../errors';

describe('toExamUnavailableReason', () => {
  it.each([
    'requires_premium',
    'no_attempts_left',
    'cooldown',
    'pool_too_small',
    'disabled',
    'not_found',
  ])('reads the %s code out of the server message', (reason) => {
    expect(toExamUnavailableReason({ code: '22023', message: `exam unavailable: ${reason}` })).toBe(
      reason,
    );
  });

  it('prefers the code in the message over the SQLSTATE', () => {
    // The paywall arrives as 42501, but the message is what says WHICH refusal it is.
    expect(
      toExamUnavailableReason({ code: '42501', message: 'exam unavailable: requires_premium' }),
    ).toBe('requires_premium');
  });

  it('falls back to the SQLSTATE when the message says nothing useful', () => {
    expect(toExamUnavailableReason({ code: '42501', message: 'permission denied' })).toBe(
      'requires_premium',
    );
    expect(toExamUnavailableReason({ code: 'P0002', message: 'no data found' })).toBe('not_found');
  });

  it('does not accept a reason the client has no copy for', () => {
    expect(
      toExamUnavailableReason({ code: '22023', message: 'exam unavailable: gone_fishing' }),
    ).toBe('unknown');
  });

  it('falls back to unknown for a network error, which carries no code at all', () => {
    expect(toExamUnavailableReason(new TypeError('Network request failed'))).toBe('unknown');
  });

  it.each([null, undefined, 'a string', 42])('survives %p', (value) => {
    expect(toExamUnavailableReason(value)).toBe('unknown');
  });
});

import { toDisplayNameProblem } from '../errors';

describe('toDisplayNameProblem', () => {
  it.each(['required', 'too_short', 'too_long', 'invalid_characters', 'reserved', 'not_allowed'])(
    'reads the %s code out of the server message',
    (problem) => {
      expect(
        toDisplayNameProblem({ code: '22023', message: `display name rejected: ${problem}` }),
      ).toBe(problem);
    },
  );

  it('maps a unique violation to "taken"', () => {
    expect(toDisplayNameProblem({ code: '23505', message: 'display name taken' })).toBe('taken');
  });

  it('treats an unrecognised 22023 as a refusal, not a crash', () => {
    // A future rule the client has not shipped a translation for is still the server saying
    // no. Showing "that name could not be used" beats showing nothing.
    expect(
      toDisplayNameProblem({ code: '22023', message: 'display name rejected: whatever' }),
    ).toBe('invalid_characters');
  });

  it('survives a message without the expected prefix', () => {
    expect(toDisplayNameProblem({ code: '22023', message: 'something else' })).toBe(
      'invalid_characters',
    );
  });

  it('falls back to unknown for an unrelated failure', () => {
    expect(toDisplayNameProblem({ code: 'PGRST301', message: 'JWT expired' })).toBe('unknown');
  });

  it('falls back to unknown for a network error, which has no code at all', () => {
    expect(toDisplayNameProblem(new TypeError('Network request failed'))).toBe('unknown');
  });

  it.each([null, undefined, 'a string', 42])('survives %p', (value) => {
    expect(toDisplayNameProblem(value)).toBe('unknown');
  });
});

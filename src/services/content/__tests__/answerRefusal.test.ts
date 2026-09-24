import { toAnswerRefusal } from '../answerRefusal';

/**
 * Telling a refused answer from a failed one (SPEC §18, §22, §42). A refusal gets its own
 * screen state; a failure keeps the generic retry — and must never be mistaken for a refusal,
 * or a learner on a bad connection would be told they were out of lives.
 */
describe('toAnswerRefusal', () => {
  it('reads out of lives', () => {
    expect(toAnswerRefusal({ code: 'LV000', message: 'out of lives' })).toBe('out-of-lives');
  });

  it('reads the rate limit', () => {
    expect(toAnswerRefusal({ code: 'RL000', message: 'rate limited: answer' })).toBe(
      'rate-limited',
    );
  });

  it('is not a refusal when the answer simply did not arrive', () => {
    expect(toAnswerRefusal(new TypeError('Network request failed'))).toBeNull();
    expect(toAnswerRefusal({ code: '42501' })).toBeNull();
    expect(toAnswerRefusal(null)).toBeNull();
  });
});

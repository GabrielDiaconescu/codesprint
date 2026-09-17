import { answerResult } from '../lessonSchema';

const result = {
  correct: true,
  attempt_no: 1,
  xp_awarded: 5,
  explanation: 'Because Python runs top to bottom.',
  hint: null,
  solution: { value: true },
};

describe('answerResult', () => {
  it('accepts a graded answer', () => {
    expect(answerResult.parse(result)).toEqual(result);
  });

  it('accepts a hint when present', () => {
    expect(answerResult.parse({ ...result, hint: 'Think about order.' }).hint).toBe('Think about order.');
  });

  it('accepts zero XP', () => {
    // A retry, a practice answer, or a question already rewarded all legitimately pay 0.
    expect(answerResult.parse({ ...result, xp_awarded: 0 }).xp_awarded).toBe(0);
  });

  it('rejects negative XP, which the ledger can never produce', () => {
    expect(answerResult.safeParse({ ...result, xp_awarded: -1 }).success).toBe(false);
  });

  it('rejects an attempt number below one', () => {
    expect(answerResult.safeParse({ ...result, attempt_no: 0 }).success).toBe(false);
  });

  it('rejects an unexpected field rather than passing it through', () => {
    expect(answerResult.safeParse({ ...result, answer_key: {} }).success).toBe(false);
  });
});

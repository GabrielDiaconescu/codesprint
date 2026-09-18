import { answerResult } from '../lessonSchema';

const result = {
  correct: true,
  attempt_no: 1,
  xp_awarded: 5,
  explanation: 'Because Python runs top to bottom.',
  hint: null,
  solution: { value: true },
  lives: { lives: 4, max: 5, unlimited: false, next_life_at: '2026-09-18T14:00:00Z' },
  current_streak: 3,
  unlocked: [],
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

  describe('lives (SPEC §22)', () => {
    it('accepts unlimited lives with no countdown', () => {
      const premium = answerResult.parse({
        ...result,
        lives: { lives: 5, max: 5, unlimited: true, next_life_at: null },
      });
      expect(premium.lives.unlimited).toBe(true);
      expect(premium.lives.next_life_at).toBeNull();
    });

    it('accepts none left', () => {
      expect(
        answerResult.parse({
          ...result,
          lives: { ...result.lives, lives: 0 },
        }).lives.lives,
      ).toBe(0);
    });

    it('rejects negative lives, which the server can never produce', () => {
      expect(
        answerResult.safeParse({ ...result, lives: { ...result.lives, lives: -1 } }).success,
      ).toBe(false);
    });
  });

  describe('unlocks (SPEC §25)', () => {
    it('accepts an unlocked achievement', () => {
      const parsed = answerResult.parse({
        ...result,
        unlocked: [{ id: 'a-1', slug: 'first-100-xp', icon_key: 'star', xp_reward: 15 }],
      });
      expect(parsed.unlocked[0]?.slug).toBe('first-100-xp');
    });

    it('accepts several at once', () => {
      const parsed = answerResult.parse({
        ...result,
        unlocked: [
          { id: 'a-1', slug: 'first-lesson', icon_key: 'footsteps', xp_reward: 10 },
          { id: 'a-2', slug: 'perfect-lesson', icon_key: 'ribbon', xp_reward: 20 },
        ],
      });
      expect(parsed.unlocked).toHaveLength(2);
    });

    it('rejects an unlock carrying its rule, which the client has no business seeing', () => {
      expect(
        answerResult.safeParse({
          ...result,
          unlocked: [
            { id: 'a-1', slug: 's', icon_key: 'star', xp_reward: 1, rule: { type: 'xp_total' } },
          ],
        }).success,
      ).toBe(false);
    });
  });
});

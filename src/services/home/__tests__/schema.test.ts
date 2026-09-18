import { challengeClaim, dailyChallenge, homeSummary, practiceSet } from '../schema';

/**
 * Home, Practice and the Daily Challenge (SPEC §13, §23, §24).
 *
 * Practice and challenge questions reuse the lesson player's `.strict()` question shape, so
 * the tests that matter most here are the ones proving an explanation or an answer key would
 * be REJECTED — a practice set is just as much a place to leak an answer as a lesson is.
 */

const question = {
  id: 'q-1',
  type: 'true_false' as const,
  difficulty: 'easy' as const,
  prompt: 'Python runs top to bottom.',
  code_snippet: null,
  payload: {},
  has_hint: false,
  skill_tags: ['python-basics'],
};

const home = {
  xp_total: 50,
  current_streak: 1,
  lives: { lives: 4, max: 5, unlimited: false, next_life_at: '2026-09-18T14:00:00Z' },
  daily_goal: { target_xp: 30, earned_xp: 50, met: true },
  next_lesson: {
    id: 'l-2',
    slug: 'printing',
    title: 'Showing output with print',
    estimated_minutes: 5,
    module_id: 'm-1',
    module_title: 'Getting Started',
    module_order: 1,
    lesson_order: 2,
  },
  course: { total: 8, completed: 1 },
  mistake_count: 2,
  challenge: { claimed: false, bonus_xp: 25 },
  is_new: false,
};

describe('homeSummary', () => {
  it('accepts a full summary', () => {
    expect(homeSummary.parse(home).next_lesson?.slug).toBe('printing');
  });

  it('accepts a brand-new learner', () => {
    const fresh = homeSummary.parse({
      ...home,
      xp_total: 0,
      current_streak: 0,
      daily_goal: { target_xp: 30, earned_xp: 0, met: false },
      course: { total: 8, completed: 0 },
      mistake_count: 0,
      is_new: true,
    });
    expect(fresh.is_new).toBe(true);
  });

  it('accepts a null next lesson, for someone who has finished everything', () => {
    // The screen says so rather than inventing a lesson that does not exist.
    expect(homeSummary.parse({ ...home, next_lesson: null }).next_lesson).toBeNull();
  });

  it('accepts unlimited lives', () => {
    const premium = homeSummary.parse({
      ...home,
      lives: { lives: 5, max: 5, unlimited: true, next_life_at: null },
    });
    expect(premium.lives.unlimited).toBe(true);
  });

  it('rejects a zero XP target, which would make the goal bar divide by zero', () => {
    expect(
      homeSummary.safeParse({ ...home, daily_goal: { target_xp: 0, earned_xp: 0, met: false } })
        .success,
    ).toBe(false);
  });

  it('rejects an unexpected field rather than passing it through', () => {
    expect(homeSummary.safeParse({ ...home, secret: 1 }).success).toBe(false);
  });
});

describe('practiceSet', () => {
  it('accepts a set of questions', () => {
    expect(practiceSet.parse({ mode: 'review', questions: [question] }).questions).toHaveLength(1);
  });

  it('accepts an empty set, which is what "nothing to review" looks like', () => {
    expect(practiceSet.parse({ mode: 'review', questions: [] }).questions).toEqual([]);
  });

  it.each(['review', 'mixed', 'hard'])('accepts the %s mode', (mode) => {
    expect(practiceSet.safeParse({ mode, questions: [] }).success).toBe(true);
  });

  it('rejects an unknown mode', () => {
    expect(practiceSet.safeParse({ mode: 'cram', questions: [] }).success).toBe(false);
  });

  /** A practice set is as much a place to leak an answer as a lesson is. */
  it('rejects a question carrying an explanation', () => {
    expect(
      practiceSet.safeParse({
        mode: 'review',
        questions: [{ ...question, explanation: 'Because.' }],
      }).success,
    ).toBe(false);
  });

  it('rejects a question carrying an answer', () => {
    expect(
      practiceSet.safeParse({
        mode: 'review',
        questions: [{ ...question, answer: { value: true } }],
      }).success,
    ).toBe(false);
  });
});

describe('dailyChallenge', () => {
  const challenge = {
    date: '2026-09-18',
    bonus_xp: 25,
    claimed: false,
    xp_awarded: 0,
    questions: [{ ...question, ord: 1 }],
  };

  it('accepts an unclaimed challenge', () => {
    expect(dailyChallenge.parse(challenge).claimed).toBe(false);
  });

  it('accepts a claimed one with its award', () => {
    expect(dailyChallenge.parse({ ...challenge, claimed: true, xp_awarded: 25 }).xp_awarded).toBe(
      25,
    );
  });

  it('rejects a challenge question carrying an answer', () => {
    expect(
      dailyChallenge.safeParse({
        ...challenge,
        questions: [{ ...question, ord: 1, answer: { value: true } }],
      }).success,
    ).toBe(false);
  });
});

describe('challengeClaim', () => {
  const claim = {
    date: '2026-09-18',
    xp_awarded: 25,
    already_claimed: false,
    current_streak: 2,
    unlocked: [],
  };

  it('accepts a first claim', () => {
    expect(challengeClaim.parse(claim).xp_awarded).toBe(25);
  });

  it('accepts a repeat claim paying nothing', () => {
    // The primary key on (user, local date) makes "once per day" structural (SPEC §24).
    const repeat = challengeClaim.parse({ ...claim, xp_awarded: 0, already_claimed: true });
    expect(repeat.already_claimed).toBe(true);
    expect(repeat.xp_awarded).toBe(0);
  });

  it('carries achievements the claim unlocked', () => {
    const parsed = challengeClaim.parse({
      ...claim,
      unlocked: [{ id: 'a-1', slug: 'first-100-xp', icon_key: 'star', xp_reward: 15 }],
    });
    expect(parsed.unlocked).toHaveLength(1);
  });

  it('rejects negative XP', () => {
    expect(challengeClaim.safeParse({ ...claim, xp_awarded: -25 }).success).toBe(false);
  });
});

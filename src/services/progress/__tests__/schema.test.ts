import { lessonCompletion, progressSummary, skillProgress, userStats } from '../schema';

const stats = {
  xp_total: 120,
  current_streak: 3,
  longest_streak: 7,
  lives: 5,
  lives_max: 5,
  lives_unlimited: false,
  next_life_at: null,
  lessons_completed: 4,
  questions_answered: 30,
  questions_correct: 24,
};

const summary = {
  xp_total: 120,
  current_streak: 3,
  longest_streak: 7,
  lessons_completed: 4,
  questions_answered: 30,
  questions_correct: 24,
  lessons_total: 8,
  lessons_completed_unlocked: 4,
  is_premium: false,
  modules: [
    {
      id: 'm-1',
      slug: 'getting-started',
      title: 'Getting Started',
      order_index: 1,
      is_premium: false,
      is_unlocked: true,
      lesson_count: 4,
      completed_count: 4,
    },
  ],
  skills: [
    {
      tag: 'printing',
      question_count: 8,
      mastered_count: 6,
      attempted_count: null,
      attempts: null,
      correct_attempts: null,
    },
  ],
  achievements: { unlocked: 2, total: 13 },
};

describe('userStats', () => {
  it('accepts a full row', () => {
    expect(userStats.parse(stats)).toEqual(stats);
  });

  it('rejects a negative total, which the ledger can never produce', () => {
    expect(userStats.safeParse({ ...stats, xp_total: -1 }).success).toBe(false);
  });

  it('rejects an unexpected field rather than passing it through', () => {
    expect(userStats.safeParse({ ...stats, level: 3 }).success).toBe(false);
  });

  it('carries no level — SPEC §20 makes it a derived display value', () => {
    expect(Object.keys(userStats.parse(stats))).not.toContain('level');
  });

  it('accepts a premium user with unlimited lives and no countdown', () => {
    const premium = userStats.parse({ ...stats, lives_unlimited: true, next_life_at: null });
    expect(premium.lives_unlimited).toBe(true);
  });

  it('accepts a pending regeneration timestamp', () => {
    expect(userStats.parse({ ...stats, lives: 2, next_life_at: '2026-09-18T14:00:00Z' }).next_life_at)
      .toBe('2026-09-18T14:00:00Z');
  });
});

describe('skillProgress', () => {
  it('accepts null accuracy, which is what a free user receives', () => {
    const free = skillProgress.parse({
      tag: 'printing',
      question_count: 8,
      mastered_count: 6,
      attempted_count: null,
      attempts: null,
      correct_attempts: null,
    });
    expect(free.correct_attempts).toBeNull();
  });

  it('accepts real numbers for a premium user', () => {
    const premium = skillProgress.parse({
      tag: 'printing',
      question_count: 8,
      mastered_count: 6,
      attempted_count: 7,
      attempts: 9,
      correct_attempts: 6,
    });
    expect(premium.attempts).toBe(9);
  });
});

describe('progressSummary', () => {
  it('accepts a full summary', () => {
    expect(progressSummary.parse(summary).modules).toHaveLength(1);
  });

  it('accepts a brand-new user with nothing done', () => {
    expect(
      progressSummary.parse({ ...summary, lessons_completed: 0, questions_answered: 0, modules: [], skills: [] })
        .skills,
    ).toEqual([]);
  });

  it('rejects a module missing its lock state', () => {
    const { is_unlocked: _omitted, ...broken } = summary.modules[0]!;
    expect(progressSummary.safeParse({ ...summary, modules: [broken] }).success).toBe(false);
  });

  it('carries the achievement tally', () => {
    expect(progressSummary.parse(summary).achievements).toEqual({ unlocked: 2, total: 13 });
  });

  it('accepts a broken streak reported as zero', () => {
    // SPEC §21: a streak not extended yesterday reads as 0, with no job having run.
    expect(progressSummary.parse({ ...summary, current_streak: 0 }).current_streak).toBe(0);
  });
});

describe('lessonCompletion', () => {
  const completion = {
    lesson_id: 'l-1',
    questions_total: 5,
    questions_correct: 5,
    first_try_correct: 5,
    is_perfect: true,
    xp_awarded: 20,
    already_completed: false,
    xp_total: 140,
    current_streak: 1,
    unlocked: [],
  };

  it('accepts a first completion', () => {
    expect(lessonCompletion.parse(completion).xp_awarded).toBe(20);
  });

  it('accepts a repeat completion paying nothing', () => {
    const repeat = lessonCompletion.parse({ ...completion, xp_awarded: 0, already_completed: true });
    expect(repeat.xp_awarded).toBe(0);
    expect(repeat.already_completed).toBe(true);
  });

  it('rejects negative XP', () => {
    expect(lessonCompletion.safeParse({ ...completion, xp_awarded: -20 }).success).toBe(false);
  });

  it('carries achievements unlocked by finishing', () => {
    const parsed = lessonCompletion.parse({
      ...completion,
      unlocked: [{ id: 'a-1', slug: 'first-lesson', icon_key: 'footsteps', xp_reward: 10 }],
    });
    expect(parsed.unlocked).toHaveLength(1);
  });

  it('carries the streak the completion produced', () => {
    expect(lessonCompletion.parse({ ...completion, current_streak: 7 }).current_streak).toBe(7);
  });
});

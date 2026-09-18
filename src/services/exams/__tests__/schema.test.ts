import { examOverview, examPaper, examResults } from '../schema';

/**
 * Exam payloads (SPEC §27).
 *
 * The assertions that carry the weight are the two halves of the same rule: a PAPER must be
 * rejected if it carries an explanation or an answer, and RESULTS must accept both — because
 * the exam is over by then. Getting either backwards is the bug this file exists to catch.
 */

const question = {
  ord: 1,
  id: 'q-1',
  type: 'true_false' as const,
  difficulty: 'easy' as const,
  prompt: 'Python runs top to bottom.',
  code_snippet: null,
  payload: {},
  has_hint: false,
  skill_tags: ['python-basics'],
};

const paper = {
  attempt_id: 'a-1',
  exam_id: 'e-1',
  resumed: false,
  title: 'Python Fundamentals — Sample Exam',
  question_count: 1,
  pass_threshold_pct: 70,
  started_at: '2026-09-18T12:00:00Z',
  expires_at: null,
  saved_answers: {},
  questions: [question],
};

const results = {
  attempt_id: 'a-1',
  exam_id: 'e-1',
  title: 'Python Fundamentals — Sample Exam',
  score_pct: '80.00',
  passed: true,
  pass_threshold_pct: 70,
  correct_count: 8,
  question_count: 10,
  skill_breakdown: { loops: 50 },
  started_at: '2026-09-18T12:00:00Z',
  submitted_at: '2026-09-18T12:20:00Z',
  xp_awarded: 80,
  unlocked: [],
  questions: [
    {
      ord: 1,
      id: 'q-1',
      type: 'true_false' as const,
      difficulty: 'easy' as const,
      prompt: 'Python runs top to bottom.',
      code_snippet: null,
      payload: {},
      skill_tags: ['python-basics'],
      submitted_answer: { value: true },
      is_correct: true,
      explanation: 'It does.',
      correct_answer: { value: true },
    },
  ],
};

describe('examPaper', () => {
  it('accepts a paper', () => {
    expect(examPaper.parse(paper).questions).toHaveLength(1);
  });

  it('accepts a timed exam', () => {
    expect(
      examPaper.parse({ ...paper, expires_at: '2026-09-18T12:45:00Z' }).expires_at,
    ).not.toBeNull();
  });

  it('accepts a resumed attempt with answers already saved', () => {
    const resumed = examPaper.parse({
      ...paper,
      resumed: true,
      saved_answers: { 'q-1': { value: true } },
    });
    expect(Object.keys(resumed.saved_answers)).toEqual(['q-1']);
  });

  /** The whole point of an exam: nothing that marks the answer travels with the question. */
  it('rejects a question carrying an explanation', () => {
    expect(
      examPaper.safeParse({
        ...paper,
        questions: [{ ...question, explanation: 'Because.' }],
      }).success,
    ).toBe(false);
  });

  it('rejects a question carrying an answer key', () => {
    expect(
      examPaper.safeParse({
        ...paper,
        questions: [{ ...question, answer: { value: true } }],
      }).success,
    ).toBe(false);
  });

  it('rejects a question carrying the hint text rather than the flag', () => {
    expect(
      examPaper.safeParse({
        ...paper,
        questions: [{ ...question, hint: 'Think about order.' }],
      }).success,
    ).toBe(false);
  });

  it('rejects an unexpected top-level field rather than passing it through', () => {
    expect(examPaper.safeParse({ ...paper, answer_key: {} }).success).toBe(false);
  });
});

describe('examResults', () => {
  it('accepts a graded attempt', () => {
    expect(examResults.parse(results).passed).toBe(true);
  });

  it('coerces the numeric score, which PostgREST sends as a string', () => {
    expect(examResults.parse(results).score_pct).toBe(80);
  });

  it('keeps the explanation and the correct answer — the exam is over (SPEC §27)', () => {
    const parsed = examResults.parse(results);
    expect(parsed.questions[0]?.explanation).toBe('It does.');
    expect(parsed.questions[0]?.correct_answer).toEqual({ value: true });
  });

  it('accepts a question that was never answered', () => {
    const skipped = examResults.parse({
      ...results,
      questions: [{ ...results.questions[0], submitted_answer: null, is_correct: false }],
    });
    expect(skipped.questions[0]?.submitted_answer).toBeNull();
  });

  it('accepts a failed attempt that earned nothing', () => {
    const failed = examResults.parse({
      ...results,
      score_pct: '30.00',
      passed: false,
      correct_count: 3,
      xp_awarded: 0,
    });
    expect(failed.xp_awarded).toBe(0);
  });

  it('rejects negative XP', () => {
    expect(examResults.safeParse({ ...results, xp_awarded: -10 }).success).toBe(false);
  });
});

describe('examOverview', () => {
  const summary = {
    id: 'e-1',
    slug: 'python-fundamentals-full',
    title: 'Python Fundamentals Exam',
    description: 'Thirty questions.',
    question_count: 30,
    time_limit_minutes: 45,
    pass_threshold_pct: 70,
    requires_premium: true,
    unavailable_reason: null,
    open_attempt_id: null,
    best_score_pct: null,
    attempts_taken: 0,
    ever_passed: false,
  };

  it('accepts a list', () => {
    expect(examOverview.parse({ enabled: true, best_xp: 0, exams: [summary] }).exams).toHaveLength(
      1,
    );
  });

  it('accepts each refusal code the server can send', () => {
    for (const reason of ['requires_premium', 'no_attempts_left', 'cooldown', 'pool_too_small']) {
      expect(
        examOverview.safeParse({
          enabled: true,
          best_xp: 0,
          exams: [{ ...summary, unavailable_reason: reason }],
        }).success,
      ).toBe(true);
    }
  });

  it('rejects a refusal code the client has no copy for', () => {
    // Better a loud parse error than a card whose explanation renders as a raw key.
    expect(
      examOverview.safeParse({
        enabled: true,
        best_xp: 0,
        exams: [{ ...summary, unavailable_reason: 'because_reasons' }],
      }).success,
    ).toBe(false);
  });

  it('coerces a best score sent as a numeric string', () => {
    const parsed = examOverview.parse({
      enabled: true,
      best_xp: 100,
      exams: [{ ...summary, best_score_pct: '83.33' }],
    });
    expect(parsed.exams[0]?.best_score_pct).toBeCloseTo(83.33);
  });

  it('accepts exams being switched off entirely (SPEC §50)', () => {
    expect(examOverview.parse({ enabled: false, best_xp: 0, exams: [] }).enabled).toBe(false);
  });
});

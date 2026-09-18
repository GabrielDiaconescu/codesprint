import type { ExamResults, ExamSummary } from '@/services';

import {
  examAction,
  firstUnansweredIndex,
  questionsShortOfPass,
  resultTone,
  strongestSkills,
  weakestSkills,
} from '../results';

const results = (patch: Partial<ExamResults> = {}): ExamResults => ({
  attempt_id: 'a-1',
  exam_id: 'e-1',
  title: 'Python Fundamentals Exam',
  score_pct: 80,
  passed: true,
  pass_threshold_pct: 70,
  correct_count: 24,
  question_count: 30,
  skill_breakdown: { loops: 50, lists: 100, functions: 75, strings: 20 },
  started_at: '2026-09-18T12:00:00Z',
  submitted_at: '2026-09-18T12:40:00Z',
  xp_awarded: 30,
  unlocked: [],
  questions: [],
  ...patch,
});

const summary = (patch: Partial<ExamSummary> = {}): ExamSummary => ({
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
  ...patch,
});

describe('weakestSkills', () => {
  it('lists the worst first', () => {
    expect(weakestSkills(results()).map((s) => s.tag)).toEqual(['strings', 'loops', 'functions']);
  });

  it('leaves out anything fully correct — that is not a weak area', () => {
    expect(weakestSkills(results()).some((s) => s.tag === 'lists')).toBe(false);
  });

  it('caps the list, because three things to revise is advice and ten is a table', () => {
    const many = results({
      skill_breakdown: { a: 10, b: 20, c: 30, d: 40, e: 50 },
    });
    expect(weakestSkills(many)).toHaveLength(3);
    expect(weakestSkills(many, 5)).toHaveLength(5);
  });

  it('breaks ties by name, so the order is stable between renders', () => {
    const tied = results({ skill_breakdown: { zebra: 50, apple: 50 } });
    expect(tied && weakestSkills(tied).map((s) => s.tag)).toEqual(['apple', 'zebra']);
  });

  it('is empty for a perfect paper', () => {
    expect(weakestSkills(results({ skill_breakdown: { loops: 100 } }))).toEqual([]);
  });

  it('is empty when the questions carried no skill tags at all', () => {
    expect(weakestSkills(results({ skill_breakdown: {} }))).toEqual([]);
  });
});

describe('strongestSkills', () => {
  it('lists only what was fully correct', () => {
    expect(strongestSkills(results()).map((s) => s.tag)).toEqual(['lists']);
  });
});

describe('questionsShortOfPass', () => {
  it('is zero once passed', () => {
    expect(questionsShortOfPass(results())).toBe(0);
  });

  it('counts the questions still needed, not the percentage points', () => {
    // 70% of 30 is 21; they got 19.
    const failed = results({ passed: false, correct_count: 19, score_pct: 63.33 });
    expect(questionsShortOfPass(failed)).toBe(2);
  });

  it('rounds the threshold up, because you cannot answer 20.9 questions', () => {
    const failed = results({
      passed: false,
      question_count: 10,
      correct_count: 6,
      pass_threshold_pct: 65,
      score_pct: 60,
    });
    // 65% of 10 is 6.5 → 7 needed, so one short.
    expect(questionsShortOfPass(failed)).toBe(1);
  });

  it('survives an empty paper without dividing by zero', () => {
    expect(
      questionsShortOfPass(results({ passed: false, question_count: 0, correct_count: 0 })),
    ).toBe(0);
  });
});

describe('resultTone', () => {
  it('is warning rather than danger for a fail — nobody is being told off', () => {
    expect(resultTone(results({ passed: false }))).toBe('warning');
    expect(resultTone(results())).toBe('success');
  });
});

describe('examAction', () => {
  it('offers to start an exam never taken', () => {
    expect(examAction(summary())).toBe('start');
  });

  it('offers to resume when an attempt is already open', () => {
    expect(examAction(summary({ open_attempt_id: 'a-1' }))).toBe('resume');
  });

  it('prefers resuming over explaining a lock', () => {
    // An attempt already in progress is always resumable: the limit that would stop a NEW
    // attempt has no bearing on one already running.
    expect(examAction(summary({ open_attempt_id: 'a-1', unavailable_reason: 'cooldown' }))).toBe(
      'resume',
    );
  });

  it('locks when there is a reason and nothing open', () => {
    expect(examAction(summary({ unavailable_reason: 'requires_premium' }))).toBe('locked');
  });

  it('offers another go to somebody who has sat it before', () => {
    expect(examAction(summary({ attempts_taken: 2 }))).toBe('retry');
  });
});

describe('firstUnansweredIndex', () => {
  const ids = ['q-1', 'q-2', 'q-3'];

  it('opens at the start when nothing was saved', () => {
    expect(firstUnansweredIndex(ids, {})).toBe(0);
  });

  it('opens where the learner stopped', () => {
    expect(firstUnansweredIndex(ids, { 'q-1': 1, 'q-2': 1 })).toBe(2);
  });

  it('skips over a gap rather than hunting for the highest answered', () => {
    // They went back and changed question 3, then the app died. Question 2 is still the one
    // waiting for them.
    expect(firstUnansweredIndex(ids, { 'q-1': 1, 'q-3': 1 })).toBe(1);
  });

  it('opens at the last question when every one is answered, ready to hand in', () => {
    expect(firstUnansweredIndex(ids, { 'q-1': 1, 'q-2': 1, 'q-3': 1 })).toBe(2);
  });

  it('survives an empty paper', () => {
    expect(firstUnansweredIndex([], {})).toBe(0);
  });
});

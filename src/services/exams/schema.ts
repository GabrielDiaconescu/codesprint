import { z } from 'zod';

import { renderableQuestion, unlockedAchievement } from '../content/lessonSchema';

/**
 * Exam mode payloads (SPEC §27).
 *
 * The paper reuses `renderableQuestion` — the same `.strict()` shape the lesson and practice
 * players consume — for one reason worth stating plainly: an explanation or an answer key
 * appearing in an exam would fail to parse here exactly as it would in a lesson. An exam is
 * the payload where a leak matters most, so it gets the strictest shape we already have,
 * rather than a looser one written specially for it.
 *
 * The RESULTS payload is the mirror image: the exam is over, so the explanation and the
 * correct answer are expected, and their absence would be the bug.
 */

export const EXAM_UNAVAILABLE_REASONS = [
  'not_found',
  'disabled',
  'requires_premium',
  'no_attempts_left',
  'cooldown',
  'pool_too_small',
  'unknown',
] as const;

export type ExamUnavailableReason = (typeof EXAM_UNAVAILABLE_REASONS)[number];

/** A question on the paper: `renderableQuestion` plus its position. */
export const examQuestion = renderableQuestion.extend({ ord: z.number().int().positive() });

export const examPaper = z
  .object({
    attempt_id: z.string(),
    exam_id: z.string(),
    /** True when this is an attempt already in progress, handed back with its clock running. */
    resumed: z.boolean(),
    title: z.string(),
    question_count: z.number().int().nonnegative(),
    pass_threshold_pct: z.number().int(),
    started_at: z.string(),
    /** Null for an exam with no time limit, such as the free sample. */
    expires_at: z.string().nullable(),
    /** Whatever was saved before the app was last closed, keyed by question id. */
    saved_answers: z.record(z.string(), z.unknown()),
    questions: z.array(examQuestion),
  })
  .strict();

const reviewedQuestion = renderableQuestion
  .omit({ has_hint: true })
  .extend({
    ord: z.number().int().positive(),
    submitted_answer: z.unknown().nullable(),
    is_correct: z.boolean(),
    /** Localized, and only ever present after the exam has been graded (SPEC §16, §27). */
    explanation: z.string().nullable(),
    correct_answer: z.unknown().nullable(),
  })
  .strict();

export const examResults = z
  .object({
    attempt_id: z.string(),
    exam_id: z.string(),
    title: z.string(),
    /** Postgres `numeric` arrives as a string over PostgREST. */
    score_pct: z.coerce.number(),
    passed: z.boolean(),
    pass_threshold_pct: z.number().int(),
    correct_count: z.coerce.number().int(),
    question_count: z.number().int().nonnegative(),
    /** Percentage correct per skill tag, for the weak-areas panel (SPEC §28). */
    skill_breakdown: z.record(z.string(), z.number()),
    started_at: z.string(),
    submitted_at: z.string(),
    xp_awarded: z.number().int().nonnegative(),
    unlocked: z.array(unlockedAchievement),
    questions: z.array(reviewedQuestion),
  })
  .strict();

export const examSummary = z
  .object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    description: z.string(),
    question_count: z.number().int().positive(),
    time_limit_minutes: z.number().int().nullable(),
    pass_threshold_pct: z.number().int(),
    requires_premium: z.boolean(),
    /** Null when the learner can start it; otherwise why not, as a code the client localizes. */
    unavailable_reason: z.enum(EXAM_UNAVAILABLE_REASONS).nullable(),
    open_attempt_id: z.string().nullable(),
    best_score_pct: z.coerce.number().nullable(),
    attempts_taken: z.number().int().nonnegative(),
    ever_passed: z.boolean(),
  })
  .strict();

export const examOverview = z
  .object({
    enabled: z.boolean(),
    best_xp: z.number().int().nonnegative(),
    exams: z.array(examSummary),
  })
  .strict();

export type ExamPaper = z.infer<typeof examPaper>;
export type ExamResults = z.infer<typeof examResults>;
export type ExamSummary = z.infer<typeof examSummary>;
export type ExamOverview = z.infer<typeof examOverview>;
export type ExamQuestion = z.infer<typeof examQuestion>;
export type ReviewedQuestion = z.infer<typeof reviewedQuestion>;

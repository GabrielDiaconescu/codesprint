import { z } from 'zod';

import { livesState, renderableQuestion } from '../content/lessonSchema';

/**
 * Home, Practice and the Daily Challenge (SPEC §6, §13, §23, §24).
 *
 * Parsed rather than trusted — these payloads are assembled by hand in SQL. Practice and
 * challenge questions reuse `renderableQuestion`, which is the same `.strict()` shape the
 * lesson player uses, so an explanation or answer key appearing in a practice set would fail
 * to parse exactly as it would in a lesson.
 */

export const dailyGoal = z
  .object({
    target_xp: z.number().int().positive(),
    earned_xp: z.number().int().nonnegative(),
    met: z.boolean(),
  })
  .strict();

export const nextLesson = z
  .object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    estimated_minutes: z.number().int().nonnegative(),
    module_id: z.string(),
    module_title: z.string(),
    module_order: z.number().int(),
    lesson_order: z.number().int(),
  })
  .strict();

export const homeSummary = z
  .object({
    xp_total: z.number().int().nonnegative(),
    current_streak: z.number().int().nonnegative(),
    lives: livesState,
    daily_goal: dailyGoal,
    /** Null when everything reachable is finished — the screen says so rather than lying. */
    next_lesson: nextLesson.nullable(),
    course: z
      .object({
        total: z.number().int().nonnegative(),
        completed: z.number().int().nonnegative(),
      })
      .strict(),
    mistake_count: z.number().int().nonnegative(),
    challenge: z
      .object({
        claimed: z.boolean(),
        bonus_xp: z.number().int().nonnegative(),
      })
      .strict(),
    is_new: z.boolean(),
  })
  .strict();

export const PRACTICE_MODES = ['review', 'mixed', 'hard'] as const;
export type PracticeMode = (typeof PRACTICE_MODES)[number];

export const practiceSet = z
  .object({
    mode: z.enum(PRACTICE_MODES),
    questions: z.array(renderableQuestion),
  })
  .strict();

export const dailyChallenge = z
  .object({
    date: z.string(),
    bonus_xp: z.number().int().nonnegative(),
    claimed: z.boolean(),
    xp_awarded: z.number().int().nonnegative(),
    questions: z.array(renderableQuestion.extend({ ord: z.number().int() })),
  })
  .strict();

export const challengeClaim = z
  .object({
    date: z.string(),
    xp_awarded: z.number().int().nonnegative(),
    already_claimed: z.boolean(),
    current_streak: z.number().int().nonnegative(),
    unlocked: z.array(
      z
        .object({
          id: z.string(),
          slug: z.string(),
          icon_key: z.string(),
          xp_reward: z.number().int().nonnegative(),
        })
        .strict(),
    ),
  })
  .strict();

export type HomeSummary = z.infer<typeof homeSummary>;
export type NextLesson = z.infer<typeof nextLesson>;
export type PracticeSet = z.infer<typeof practiceSet>;
export type DailyChallenge = z.infer<typeof dailyChallenge>;
export type ChallengeClaim = z.infer<typeof challengeClaim>;

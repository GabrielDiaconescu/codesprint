import { z } from 'zod';

/**
 * What the progress RPCs return (SPEC §6, §28).
 *
 * Parsed rather than trusted: these payloads are assembled by hand in SQL, so a shape mistake
 * should surface here with a field name rather than as a `NaN` in a progress ring.
 *
 * Note what is NOT here: a level. SPEC §20 makes it a derived display value, computed from XP
 * and the configured thresholds, so the server never sends one and there is only ever one
 * place the rule lives.
 */

export const userStats = z
  .object({
    xp_total: z.number().int().nonnegative(),
    current_streak: z.number().int().nonnegative(),
    longest_streak: z.number().int().nonnegative(),
    lives: z.number().int().nonnegative(),
    lessons_completed: z.number().int().nonnegative(),
    questions_answered: z.number().int().nonnegative(),
    questions_correct: z.number().int().nonnegative(),
  })
  .strict();

export const moduleProgress = z
  .object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    order_index: z.number().int(),
    is_premium: z.boolean(),
    is_unlocked: z.boolean(),
    lesson_count: z.number().int().nonnegative(),
    completed_count: z.number().int().nonnegative(),
  })
  .strict();

/**
 * A skill area (SPEC §28).
 *
 * `mastered_count / question_count` is coverage of the course — which is why an area the
 * learner has never reached reads 0% rather than being absent. The attempt counts are
 * Premium-only and arrive as null for everyone else, because the server omits them rather
 * than the client hiding them.
 */
export const skillProgress = z
  .object({
    tag: z.string(),
    question_count: z.number().int().nonnegative(),
    mastered_count: z.number().int().nonnegative(),
    attempted_count: z.number().int().nonnegative().nullable(),
    attempts: z.number().int().nonnegative().nullable(),
    correct_attempts: z.number().int().nonnegative().nullable(),
  })
  .strict();

export const progressSummary = z
  .object({
    xp_total: z.number().int().nonnegative(),
    current_streak: z.number().int().nonnegative(),
    longest_streak: z.number().int().nonnegative(),
    lessons_completed: z.number().int().nonnegative(),
    questions_answered: z.number().int().nonnegative(),
    questions_correct: z.number().int().nonnegative(),
    lessons_total: z.number().int().nonnegative(),
    lessons_completed_unlocked: z.number().int().nonnegative(),
    is_premium: z.boolean(),
    modules: z.array(moduleProgress),
    skills: z.array(skillProgress),
  })
  .strict();

export const lessonCompletion = z
  .object({
    lesson_id: z.string(),
    questions_total: z.number().int().nonnegative(),
    questions_correct: z.number().int().nonnegative(),
    first_try_correct: z.number().int().nonnegative(),
    is_perfect: z.boolean(),
    xp_awarded: z.number().int().nonnegative(),
    already_completed: z.boolean(),
    xp_total: z.number().int().nonnegative(),
  })
  .strict();

export type UserStats = z.infer<typeof userStats>;
export type ModuleProgress = z.infer<typeof moduleProgress>;
export type SkillProgress = z.infer<typeof skillProgress>;
export type ProgressSummary = z.infer<typeof progressSummary>;
export type LessonCompletion = z.infer<typeof lessonCompletion>;

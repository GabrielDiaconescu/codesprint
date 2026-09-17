import { z } from 'zod';

/**
 * The shape `get_lesson` returns (SPEC §6: Zod for RPC responses).
 *
 * Parsed rather than trusted, because a lesson is the one payload assembled by hand in SQL.
 * A renderer receiving a block it does not understand should fail here, with a message naming
 * the field, rather than three components deeper with `undefined is not an object`.
 *
 * Note what is absent: `explanation`, `hint` and any answer. The server does not send them
 * (SPEC §17), and this schema is `.strict()` so it would reject them if it ever did — a
 * second, independent place where the leak would surface.
 */

export const QUESTION_TYPES = [
  'multiple_choice',
  'multiple_select',
  'true_false',
  'predict_output',
  'fill_blank',
  'code_ordering',
  'debugging',
  'concept_matching',
  'coding_challenge',
] as const;

const textBlock = z.object({ type: z.literal('text'), body: z.string() }).strict();

const codeBlock = z
  .object({
    type: z.literal('code'),
    code: z.string(),
    output: z.string().optional(),
    caption: z.string().optional(),
    runnable: z.boolean().optional(),
  })
  .strict();

const calloutBlock = z
  .object({
    type: z.literal('callout'),
    variant: z.enum(['note', 'tip', 'mistake']),
    body: z.string(),
  })
  .strict();

export const renderableQuestion = z
  .object({
    id: z.string(),
    type: z.enum(QUESTION_TYPES),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    prompt: z.string(),
    code_snippet: z.string().nullable(),
    payload: z.unknown(),
    /** Whether a hint exists — never the hint itself, which is a Phase 8 request. */
    has_hint: z.boolean(),
    skill_tags: z.array(z.string()),
  })
  .strict();

const questionBlock = z
  .object({ type: z.literal('question'), question: renderableQuestion })
  .strict();

export const lessonBlock = z.discriminatedUnion('type', [
  textBlock,
  codeBlock,
  calloutBlock,
  questionBlock,
]);

export const lessonResponse = z
  .object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    summary: z.string(),
    estimated_minutes: z.number(),
    order_index: z.number(),
    module: z
      .object({
        id: z.string(),
        slug: z.string(),
        title: z.string(),
        order_index: z.number(),
      })
      .strict(),
    blocks: z.array(lessonBlock),
  })
  .strict();

export type LessonResponse = z.infer<typeof lessonResponse>;
export type LessonBlock = z.infer<typeof lessonBlock>;
export type RenderableQuestion = z.infer<typeof renderableQuestion>;

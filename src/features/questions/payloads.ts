import { z } from 'zod';

import type { RenderableQuestion } from '@/services';

/**
 * What each question type's `payload` looks like once localised by the server (SPEC §16).
 *
 * These are the RENDERING schemas: options, tokens, lines, pairs — and nothing that would
 * let a renderer know the answer. They are parsed at the boundary so a renderer never has
 * to defend against `payload.options` being undefined three levels down.
 *
 * Text fields are plain strings here, not `{ en: ... }` objects: `get_lesson` collapses
 * localized text to one locale before it leaves the database (`localize_deep`).
 */

const option = z.object({ id: z.string(), text: z.string() }).strict();
const line = z.object({ id: z.string(), text: z.string() }).strict();

export const multipleChoicePayload = z.object({ options: z.array(option).min(2) }).strict();
export const multipleSelectPayload = z.object({ options: z.array(option).min(3) }).strict();
export const trueFalsePayload = z.object({}).strict();

export const predictOutputPayload = z
  .object({
    input: z.enum(['text', 'choice']),
    options: z.array(option).optional(),
  })
  .strict();

export const fillBlankPayload = z
  .object({
    input: z.enum(['tokens', 'text']),
    tokens: z.array(z.string()).optional(),
  })
  .strict();

export const codeOrderingPayload = z.object({ lines: z.array(line).min(3) }).strict();

export const debuggingPayload = z
  .object({
    mode: z.enum(['select_line', 'choose_fix', 'both']),
    lines: z.array(line).optional(),
    options: z.array(option).optional(),
  })
  .strict();

export const conceptMatchingPayload = z
  .object({
    concepts: z.array(option).min(3),
    definitions: z.array(option).min(3),
  })
  .strict();

export type MultipleChoicePayload = z.infer<typeof multipleChoicePayload>;
export type MultipleSelectPayload = z.infer<typeof multipleSelectPayload>;
export type PredictOutputPayload = z.infer<typeof predictOutputPayload>;
export type FillBlankPayload = z.infer<typeof fillBlankPayload>;
export type CodeOrderingPayload = z.infer<typeof codeOrderingPayload>;
export type DebuggingPayload = z.infer<typeof debuggingPayload>;
export type ConceptMatchingPayload = z.infer<typeof conceptMatchingPayload>;

/** A parsed payload, tagged by type so a switch over it is exhaustive. */
export type ParsedQuestion =
  | { type: 'multiple_choice'; payload: MultipleChoicePayload }
  | { type: 'multiple_select'; payload: MultipleSelectPayload }
  | { type: 'true_false'; payload: Record<string, never> }
  | { type: 'predict_output'; payload: PredictOutputPayload }
  | { type: 'fill_blank'; payload: FillBlankPayload }
  | { type: 'code_ordering'; payload: CodeOrderingPayload }
  | { type: 'debugging'; payload: DebuggingPayload }
  | { type: 'concept_matching'; payload: ConceptMatchingPayload };

/**
 * Parses a question's payload for its type, or returns null when it cannot be rendered.
 *
 * Null rather than a throw: a single malformed question must not take a whole lesson down
 * with it. The player skips what it cannot render and reports it (SPEC §46).
 */
export const parseQuestion = (question: RenderableQuestion): ParsedQuestion | null => {
  const raw = question.payload ?? {};

  switch (question.type) {
    case 'multiple_choice': {
      const r = multipleChoicePayload.safeParse(raw);
      return r.success ? { type: 'multiple_choice', payload: r.data } : null;
    }
    case 'multiple_select': {
      const r = multipleSelectPayload.safeParse(raw);
      return r.success ? { type: 'multiple_select', payload: r.data } : null;
    }
    case 'true_false': {
      const r = trueFalsePayload.safeParse(raw);
      return r.success ? { type: 'true_false', payload: {} } : null;
    }
    case 'predict_output': {
      const r = predictOutputPayload.safeParse(raw);
      if (!r.success) return null;
      if (r.data.input === 'choice' && (r.data.options?.length ?? 0) < 2) return null;
      return { type: 'predict_output', payload: r.data };
    }
    case 'fill_blank': {
      const r = fillBlankPayload.safeParse(raw);
      if (!r.success) return null;
      if (r.data.input === 'tokens' && (r.data.tokens?.length ?? 0) < 2) return null;
      return { type: 'fill_blank', payload: r.data };
    }
    case 'code_ordering': {
      const r = codeOrderingPayload.safeParse(raw);
      return r.success ? { type: 'code_ordering', payload: r.data } : null;
    }
    case 'debugging': {
      const r = debuggingPayload.safeParse(raw);
      if (!r.success) return null;
      const needsLines = r.data.mode !== 'choose_fix';
      const needsOptions = r.data.mode !== 'select_line';
      if (needsLines && (r.data.lines?.length ?? 0) < 2) return null;
      if (needsOptions && (r.data.options?.length ?? 0) < 2) return null;
      return { type: 'debugging', payload: r.data };
    }
    case 'concept_matching': {
      const r = conceptMatchingPayload.safeParse(raw);
      return r.success ? { type: 'concept_matching', payload: r.data } : null;
    }
    case 'coding_challenge':
      // Schema-only in V1 (SPEC §16). No renderer exists and none is pretended.
      return null;
  }
};

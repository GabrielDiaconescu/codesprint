/**
 * What the learner submits, per question type (SPEC §16).
 *
 * These are the exact JSON shapes `submit_answer` grades, and the shape `solution` comes
 * back in afterwards. Keeping them as one discriminated union means a renderer's `value` and
 * the grader's input cannot drift apart without the type checker noticing.
 */

export type AnswerValue =
  | { type: 'multiple_choice'; option_id?: string }
  | { type: 'multiple_select'; option_ids: string[] }
  | { type: 'true_false'; value?: boolean }
  | { type: 'predict_output'; value?: string; option_id?: string }
  | { type: 'fill_blank'; value?: string }
  | { type: 'code_ordering'; order: string[] }
  | { type: 'debugging'; line_id?: string; option_id?: string }
  | { type: 'concept_matching'; pairs: Record<string, string> };

export type AnswerType = AnswerValue['type'];

/** The answer key as `submit_answer` releases it after an attempt. */
export type Solution =
  | { option_id: string }
  | { option_ids: string[] }
  | { value: boolean }
  | { value: string }
  | { order: string[] }
  | { line_id?: string; option_id?: string }
  | { pairs: Record<string, string> };

/** The starting value for a type: nothing chosen, nothing typed. */
export const emptyAnswer = (type: AnswerType): AnswerValue => {
  switch (type) {
    case 'multiple_choice':
      return { type };
    case 'multiple_select':
      return { type, option_ids: [] };
    case 'true_false':
      return { type };
    case 'predict_output':
      return { type };
    case 'fill_blank':
      return { type };
    case 'code_ordering':
      return { type, order: [] };
    case 'debugging':
      return { type };
    case 'concept_matching':
      return { type, pairs: {} };
  }
};

/**
 * Strips the client-side discriminator before sending. The server keys on the question's
 * type, not on a field the client could set to anything.
 */
export const toSubmission = (value: AnswerValue): Record<string, unknown> => {
  const { type: _discriminator, ...submission } = value;
  return submission;
};

import type { ParsedQuestion } from '../payloads';
import type { AnswerValue } from '../types';

/**
 * Whether an answer is complete enough to check (SPEC §18).
 *
 * The Check button stays disabled until this says yes, so a learner cannot submit an empty
 * answer by accident and lose an attempt to a mis-tap. It is a client convenience only: the
 * server grades whatever arrives, and an empty answer is simply wrong there.
 */
export const isAnswerComplete = (question: ParsedQuestion, value: AnswerValue): boolean => {
  if (question.type !== value.type) return false;

  switch (value.type) {
    case 'multiple_choice':
      return typeof value.option_id === 'string';

    case 'multiple_select':
      return value.option_ids.length > 0;

    case 'true_false':
      return typeof value.value === 'boolean';

    case 'predict_output':
      return question.type === 'predict_output' && question.payload.input === 'choice'
        ? typeof value.option_id === 'string'
        : typeof value.value === 'string' && value.value.trim().length > 0;

    case 'fill_blank':
      return typeof value.value === 'string' && value.value.trim().length > 0;

    case 'code_ordering':
      return (
        question.type === 'code_ordering' && value.order.length === question.payload.lines.length
      );

    case 'debugging': {
      if (question.type !== 'debugging') return false;
      const hasLine = typeof value.line_id === 'string';
      const hasFix = typeof value.option_id === 'string';
      switch (question.payload.mode) {
        case 'select_line':
          return hasLine;
        case 'choose_fix':
          return hasFix;
        case 'both':
          return hasLine && hasFix;
      }
      return false;
    }

    case 'concept_matching':
      return (
        question.type === 'concept_matching' &&
        Object.keys(value.pairs).length === question.payload.concepts.length
      );
  }
};

/** Toggles one id in a multi-select, preserving the order the learner tapped in. */
export const toggleId = (ids: string[], id: string): string[] =>
  ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id];

import type { RenderableQuestion } from '@/services';

import type { ParsedQuestion } from '../payloads';
import type { AnswerValue, Solution } from '../types';

import { CodeOrdering } from './CodeOrdering';
import { ConceptMatching } from './ConceptMatching';
import { Debugging } from './Debugging';
import { MultipleChoice, MultipleSelect, TrueFalse } from './SimpleChoices';
import { FillBlank, PredictOutput } from './TextAnswers';

export interface QuestionRendererProps {
  question: RenderableQuestion;
  parsed: ParsedQuestion;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  /** True once graded: no further input, and the marking is shown. */
  disabled: boolean;
  solution?: Solution;
  correct?: boolean;
}

/**
 * Dispatches a question to the renderer for its type (SPEC §16).
 *
 * The parsed payload and the answer value are both discriminated on `type`, so the switch is
 * exhaustive and every branch is fully typed. A mismatch between the two — which cannot happen
 * through the player, but could through a bug — renders nothing rather than crashing.
 */
export const QuestionRenderer = ({
  question,
  parsed,
  value,
  onChange,
  disabled,
  solution,
  correct,
}: QuestionRendererProps) => {
  switch (parsed.type) {
    case 'multiple_choice':
      if (value.type !== 'multiple_choice') return null;
      return (
        <MultipleChoice
          payload={parsed.payload}
          value={value}
          onChange={onChange}
          disabled={disabled}
          solution={solution}
        />
      );

    case 'multiple_select':
      if (value.type !== 'multiple_select') return null;
      return (
        <MultipleSelect
          payload={parsed.payload}
          value={value}
          onChange={onChange}
          disabled={disabled}
          solution={solution}
        />
      );

    case 'true_false':
      if (value.type !== 'true_false') return null;
      return (
        <TrueFalse value={value} onChange={onChange} disabled={disabled} solution={solution} />
      );

    case 'predict_output':
      if (value.type !== 'predict_output') return null;
      return (
        <PredictOutput
          codeSnippet={question.code_snippet}
          payload={parsed.payload}
          value={value}
          onChange={onChange}
          disabled={disabled}
          solution={solution}
          correct={correct}
        />
      );

    case 'fill_blank':
      if (value.type !== 'fill_blank') return null;
      return (
        <FillBlank
          codeSnippet={question.code_snippet}
          payload={parsed.payload}
          value={value}
          onChange={onChange}
          disabled={disabled}
          solution={solution}
          correct={correct}
        />
      );

    case 'code_ordering':
      if (value.type !== 'code_ordering') return null;
      return (
        <CodeOrdering
          questionId={question.id}
          payload={parsed.payload}
          value={value}
          onChange={onChange}
          disabled={disabled}
          solution={solution}
        />
      );

    case 'debugging':
      if (value.type !== 'debugging') return null;
      return (
        <Debugging
          codeSnippet={question.code_snippet}
          payload={parsed.payload}
          value={value}
          onChange={onChange}
          disabled={disabled}
          solution={solution}
        />
      );

    case 'concept_matching':
      if (value.type !== 'concept_matching') return null;
      return (
        <ConceptMatching
          questionId={question.id}
          payload={parsed.payload}
          value={value}
          onChange={onChange}
          disabled={disabled}
          solution={solution}
        />
      );
  }
};

/** The instruction line under the prompt, chosen by type and — where it matters — by mode. */
export const instructionKey = (parsed: ParsedQuestion): string => {
  switch (parsed.type) {
    case 'predict_output':
      return `question.instructions.predict_output_${parsed.payload.input}`;
    case 'fill_blank':
      return `question.instructions.fill_blank_${parsed.payload.input}`;
    case 'debugging':
      return `question.instructions.debugging_${parsed.payload.mode}`;
    default:
      return `question.instructions.${parsed.type}`;
  }
};

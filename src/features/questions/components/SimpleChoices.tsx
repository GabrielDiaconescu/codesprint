import { useTranslation } from 'react-i18next';

import type { MultipleChoicePayload, MultipleSelectPayload } from '../payloads';
import { toggleId } from '../logic/answers';
import type { AnswerValue, Solution } from '../types';

import { ChoiceList } from './ChoiceList';

/**
 * The three "pick from a list" renderers (SPEC §16). Thin on purpose: `ChoiceList` owns the
 * behaviour, and each of these only maps its answer shape onto ids.
 */

interface Common {
  disabled: boolean;
  solution?: Solution;
}

export const MultipleChoice = ({
  payload,
  value,
  onChange,
  disabled,
  solution,
}: Common & {
  payload: MultipleChoicePayload;
  value: Extract<AnswerValue, { type: 'multiple_choice' }>;
  onChange: (value: AnswerValue) => void;
}) => (
  <ChoiceList
    options={payload.options}
    selectedIds={value.option_id ? [value.option_id] : []}
    onSelect={(id) => onChange({ type: 'multiple_choice', option_id: id })}
    disabled={disabled}
    correctIds={solution && 'option_id' in solution ? [solution.option_id as string] : undefined}
  />
);

export const MultipleSelect = ({
  payload,
  value,
  onChange,
  disabled,
  solution,
}: Common & {
  payload: MultipleSelectPayload;
  value: Extract<AnswerValue, { type: 'multiple_select' }>;
  onChange: (value: AnswerValue) => void;
}) => (
  <ChoiceList
    multi
    options={payload.options}
    selectedIds={value.option_ids}
    onSelect={(id) =>
      onChange({ type: 'multiple_select', option_ids: toggleId(value.option_ids, id) })
    }
    disabled={disabled}
    correctIds={solution && 'option_ids' in solution ? solution.option_ids : undefined}
  />
);

export const TrueFalse = ({
  value,
  onChange,
  disabled,
  solution,
}: Common & {
  value: Extract<AnswerValue, { type: 'true_false' }>;
  onChange: (value: AnswerValue) => void;
}) => {
  const { t } = useTranslation('lesson');

  const correct =
    solution && 'value' in solution && typeof solution.value === 'boolean'
      ? [solution.value ? 'true' : 'false']
      : undefined;

  return (
    <ChoiceList
      options={[
        { id: 'true', text: t('question.trueLabel') },
        { id: 'false', text: t('question.falseLabel') },
      ]}
      selectedIds={value.value === undefined ? [] : [value.value ? 'true' : 'false']}
      onSelect={(id) => onChange({ type: 'true_false', value: id === 'true' })}
      disabled={disabled}
      correctIds={correct}
      testIDPrefix="tf"
    />
  );
};

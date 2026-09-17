import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

import { seededShuffle } from '../logic/shuffle';
import type { CodeOrderingPayload } from '../payloads';
import type { AnswerValue, Solution } from '../types';

import { CodeLine, type LineMarking } from './CodeLine';

/**
 * code_ordering (SPEC §16): build the program by tapping lines in order.
 *
 * Tap-to-append rather than drag-and-drop. Dragging is fiddly on a phone, unreliable with a
 * screen reader, and needs a native gesture library for every learner in exchange for a
 * flourish. Tapping a placed line removes it again, so a mistake costs one tap.
 *
 * The bank is shuffled deterministically by question id: the same question always shuffles
 * the same way, so the lines never move under a finger on re-render.
 */
export const CodeOrdering = ({
  questionId,
  payload,
  value,
  onChange,
  disabled,
  solution,
}: {
  questionId: string;
  payload: CodeOrderingPayload;
  value: Extract<AnswerValue, { type: 'code_ordering' }>;
  onChange: (value: AnswerValue) => void;
  disabled: boolean;
  solution?: Solution;
}) => {
  const { t } = useTranslation('lesson');
  const theme = useTheme();

  const byId = useMemo(() => new Map(payload.lines.map((line) => [line.id, line.text])), [payload]);
  const bank = useMemo(() => seededShuffle(payload.lines, questionId), [payload, questionId]);

  const placed = value.order;
  const remaining = bank.filter((line) => !placed.includes(line.id));
  const expected = solution && 'order' in solution ? solution.order : undefined;

  const markingAt = (index: number, id: string): LineMarking => {
    if (!expected) return 'none';
    return expected[index] === id ? 'correct' : 'wrong';
  };

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="label" tone="secondary">
          {t('question.ordering.answer')}
        </Text>

        {placed.length === 0 ? (
          <Text variant="caption" tone="secondary">
            {t('question.ordering.empty')}
          </Text>
        ) : (
          placed.map((id, index) => (
            <CodeLine
              key={id}
              testID={`placed-${id}`}
              gutter={String(index + 1)}
              text={byId.get(id) ?? ''}
              marking={markingAt(index, id)}
              accessibilityLabel={t('question.ordering.position', {
                position: index + 1,
                line: byId.get(id) ?? '',
              })}
              onPress={
                disabled
                  ? undefined
                  : () => onChange({ type: 'code_ordering', order: placed.filter((p) => p !== id) })
              }
            />
          ))
        )}
      </View>

      {remaining.length > 0 && (
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="label" tone="secondary">
            {t('question.ordering.bank')}
          </Text>
          {remaining.map((line) => (
            <CodeLine
              key={line.id}
              testID={`bank-${line.id}`}
              gutter="+"
              text={line.text}
              accessibilityLabel={t('question.ordering.add', { line: line.text })}
              onPress={
                disabled
                  ? undefined
                  : () => onChange({ type: 'code_ordering', order: [...placed, line.id] })
              }
            />
          ))}
        </View>
      )}
    </View>
  );
};

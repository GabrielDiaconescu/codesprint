import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { CodeBlock, Text } from '@/components/ui';
import { useTheme } from '@/theme';

import type { DebuggingPayload } from '../payloads';
import type { AnswerValue, Solution } from '../types';

import { ChoiceList } from './ChoiceList';
import { CodeLine, type LineMarking } from './CodeLine';

/**
 * debugging (SPEC §16): find the faulty line, choose the fix, or both.
 *
 * In line-selection modes the snippet is rendered as tappable lines rather than a code block,
 * so the thing being asked about is the thing being tapped. In choose-fix mode the code is
 * read-only context and the choice is a plain list.
 */
export const Debugging = ({
  codeSnippet,
  payload,
  value,
  onChange,
  disabled,
  solution,
}: {
  codeSnippet: string | null;
  payload: DebuggingPayload;
  value: Extract<AnswerValue, { type: 'debugging' }>;
  onChange: (value: AnswerValue) => void;
  disabled: boolean;
  solution?: Solution;
}) => {
  const { t } = useTranslation('lesson');
  const theme = useTheme();

  const selectsLine = payload.mode !== 'choose_fix';
  const choosesFix = payload.mode !== 'select_line';

  const expectedLine =
    solution && 'line_id' in solution && typeof solution.line_id === 'string'
      ? solution.line_id
      : undefined;
  const expectedFix =
    solution && 'option_id' in solution && typeof solution.option_id === 'string'
      ? solution.option_id
      : undefined;

  const lineMarking = (id: string): LineMarking => {
    if (expectedLine !== undefined) {
      if (id === expectedLine) return 'correct';
      if (id === value.line_id) return 'wrong';
      return 'none';
    }
    return id === value.line_id ? 'selected' : 'none';
  };

  return (
    <View style={{ gap: theme.spacing.lg }}>
      {selectsLine ? (
        <View style={{ gap: theme.spacing.sm }}>
          {(payload.lines ?? []).map((line, index) => (
            <CodeLine
              key={line.id}
              testID={`line-${line.id}`}
              gutter={String(index + 1)}
              text={line.text}
              marking={lineMarking(line.id)}
              accessibilityLabel={`${index + 1}: ${line.text}`}
              accessibilityHint={t('question.instructions.debugging_select_line')}
              onPress={disabled ? undefined : () => onChange({ ...value, line_id: line.id })}
            />
          ))}
        </View>
      ) : (
        codeSnippet && <CodeBlock code={codeSnippet} />
      )}

      {choosesFix && (
        <View style={{ gap: theme.spacing.sm }}>
          {payload.mode === 'both' && (
            <Text variant="label" tone="secondary">
              {t('question.instructions.debugging_choose_fix')}
            </Text>
          )}
          <ChoiceList
            options={(payload.options ?? []).map((o) => ({ ...o, mono: true }))}
            selectedIds={value.option_id ? [value.option_id] : []}
            onSelect={(id) => onChange({ ...value, option_id: id })}
            disabled={disabled}
            correctIds={expectedFix === undefined ? undefined : [expectedFix]}
            testIDPrefix="fix"
          />
        </View>
      )}
    </View>
  );
};

import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Chip, CodeBlock, Icon, Text, TextField } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';

import type { FillBlankPayload, PredictOutputPayload } from '../payloads';
import type { AnswerValue, Solution } from '../types';

import { ChoiceList } from './ChoiceList';

/**
 * predict_output and fill_blank (SPEC §16).
 *
 * Both accept free text under strict keyboard settings — no autocorrect, no capitalisation,
 * no spellcheck — because a keyboard that "fixes" `print` into `Print` produces a wrong
 * answer the learner cannot see. The server straightens curly quotes and dashes anyway, but
 * the keyboard should not be introducing them in the first place.
 */

interface Common {
  disabled: boolean;
  solution?: Solution;
}

/** After grading, the expected text when the learner's was wrong. */
const ExpectedText = ({ value }: { value: string }) => {
  const { t } = useTranslation('lesson');
  const theme = useTheme();
  return (
    <View style={[styles.expected, { gap: theme.spacing.sm }]}>
      <Icon name="checkmark-circle" size="sm" color={theme.colors.success} />
      <Text variant="caption" tone="secondary">
        {t('question.expected')}
      </Text>
      <Text variant="mono">{value}</Text>
    </View>
  );
};

export const PredictOutput = ({
  codeSnippet,
  payload,
  value,
  onChange,
  disabled,
  solution,
  correct,
}: Common & {
  codeSnippet: string | null;
  payload: PredictOutputPayload;
  value: Extract<AnswerValue, { type: 'predict_output' }>;
  onChange: (value: AnswerValue) => void;
  correct?: boolean;
}) => {
  const { t } = useTranslation('lesson');
  const theme = useTheme();

  const expected =
    solution && 'value' in solution && typeof solution.value === 'string' ? solution.value : null;

  return (
    <View style={{ gap: theme.spacing.lg }}>
      {codeSnippet && <CodeBlock code={codeSnippet} />}

      {payload.input === 'choice' ? (
        <ChoiceList
          options={(payload.options ?? []).map((o) => ({ ...o, mono: true }))}
          selectedIds={value.option_id ? [value.option_id] : []}
          onSelect={(id) => onChange({ type: 'predict_output', option_id: id })}
          disabled={disabled}
          // The key holds the output TEXT; the correct option is whichever carries it.
          correctIds={
            expected === null
              ? undefined
              : (payload.options ?? []).filter((o) => o.text === expected).map((o) => o.id)
          }
        />
      ) : (
        <>
          <TextField
            testID="answer-text"
            label={t('question.outputLabel')}
            placeholder={t('question.outputPlaceholder')}
            value={value.value ?? ''}
            onChangeText={(text) => onChange({ type: 'predict_output', value: text })}
            editable={!disabled}
            mono
            returnKeyType="done"
          />
          {expected !== null && correct === false && <ExpectedText value={expected} />}
        </>
      )}
    </View>
  );
};

export const FillBlank = ({
  codeSnippet,
  payload,
  value,
  onChange,
  disabled,
  solution,
  correct,
}: Common & {
  codeSnippet: string | null;
  payload: FillBlankPayload;
  value: Extract<AnswerValue, { type: 'fill_blank' }>;
  onChange: (value: AnswerValue) => void;
  correct?: boolean;
}) => {
  const { t } = useTranslation('lesson');
  const theme = useTheme();

  const expected =
    solution && 'value' in solution && typeof solution.value === 'string' ? solution.value : null;

  // The blank is filled in live, so the learner reads the line as it would actually run.
  const filled = (codeSnippet ?? '').replace('___', value.value?.trim() ? value.value : '___');

  return (
    <View style={{ gap: theme.spacing.lg }}>
      {codeSnippet && (
        <CodeBlock
          code={filled}
          accessibilityLabel={
            value.value ? filled : (codeSnippet ?? '').replace('___', t('question.blankMarker'))
          }
        />
      )}

      {payload.input === 'tokens' ? (
        <View style={[styles.tokens, { gap: theme.spacing.sm }]} accessibilityRole="radiogroup">
          {(payload.tokens ?? []).map((token) => {
            const chosen = value.value === token;
            const isExpected = expected !== null && token === expected;
            return (
              <Chip
                key={token}
                testID={`token-${token}`}
                label={token}
                selected={chosen}
                disabled={disabled}
                icon={
                  expected === null
                    ? undefined
                    : isExpected
                      ? 'checkmark-circle'
                      : chosen
                        ? 'close-circle'
                        : undefined
                }
                onPress={() => {
                  haptics.select();
                  onChange({ type: 'fill_blank', value: token });
                }}
              />
            );
          })}
        </View>
      ) : (
        <>
          <TextField
            testID="answer-text"
            label={t('question.blankLabel')}
            placeholder={t('question.blankPlaceholder')}
            value={value.value ?? ''}
            onChangeText={(text) => onChange({ type: 'fill_blank', value: text })}
            editable={!disabled}
            mono
            returnKeyType="done"
          />
          {expected !== null && correct === false && <ExpectedText value={expected} />}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tokens: { flexDirection: 'row', flexWrap: 'wrap' },
  expected: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
});

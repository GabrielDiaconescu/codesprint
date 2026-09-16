import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

export interface AnswerFeedbackProps {
  status: 'correct' | 'incorrect';
  /** Why the correct answer is correct. Always shown (SPEC §18). */
  explanation: string;
  /** Optional nudge, offered on an incorrect answer. */
  hint?: string;
  /** XP awarded, shown only on a correct answer and only when greater than zero. */
  xpAwarded?: number;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  correctLabel: string;
  incorrectLabel: string;
  hintLabel?: string;
  testID?: string;
}

/**
 * Answer feedback panel (SPEC §8, §18).
 *
 * Deliberate choices:
 *  - result is carried by an ICON + TEXT as well as colour, never colour alone (SPEC §47)
 *  - an incorrect answer gets no shaming language and always gets the explanation
 *  - the panel is announced as a live region, so a screen reader speaks the result without
 *    the user having to hunt for it
 *
 * This component is presentational. Grading, XP and lives are server-side (SPEC §19, §22);
 * haptics and sound are wired where it is used (Phase 8).
 */
export const AnswerFeedback = ({
  status,
  explanation,
  hint,
  xpAwarded,
  primaryActionLabel,
  onPrimaryAction,
  correctLabel,
  incorrectLabel,
  hintLabel,
  testID,
}: AnswerFeedbackProps) => {
  const theme = useTheme();
  const isCorrect = status === 'correct';

  const surface = isCorrect ? theme.colors.successSurface : theme.colors.dangerSurface;
  const accent = isCorrect ? theme.colors.success : theme.colors.danger;

  return (
    <View
      testID={testID}
      accessibilityLiveRegion="polite"
      accessible={false}
      style={[
        styles.root,
        {
          backgroundColor: surface,
          borderTopColor: accent,
          padding: theme.spacing.lg,
          gap: theme.spacing.md,
        },
      ]}
    >
      <View style={[styles.header, { gap: theme.spacing.sm }]}>
        <Icon name={isCorrect ? 'checkmark-circle' : 'close-circle'} size="lg" color={accent} />
        <Text variant="heading" style={[styles.headerText, { color: accent }]}>
          {isCorrect ? correctLabel : incorrectLabel}
        </Text>
        {isCorrect && xpAwarded !== undefined && xpAwarded > 0 && (
          <Text variant="bodyStrong" style={{ color: accent }}>
            {`+${xpAwarded} XP`}
          </Text>
        )}
      </View>

      <Text variant="body" style={{ color: theme.colors.textPrimary }}>
        {explanation}
      </Text>

      {!isCorrect && hint && (
        <View style={[styles.hint, { gap: theme.spacing.xs }]}>
          {hintLabel && (
            <Text variant="label" tone="secondary">
              {hintLabel}
            </Text>
          )}
          <Text variant="bodySmall" tone="secondary">
            {hint}
          </Text>
        </View>
      )}

      <Button
        label={primaryActionLabel}
        onPress={onPrimaryAction}
        variant={isCorrect ? 'primary' : 'secondary'}
        fullWidth
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { width: '100%', borderTopWidth: 3 },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerText: { flexShrink: 1 },
  hint: { width: '100%' },
});

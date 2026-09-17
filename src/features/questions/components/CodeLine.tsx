import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text, type IconName } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';

export type LineMarking = 'none' | 'selected' | 'correct' | 'wrong';

interface CodeLineProps {
  text: string;
  /** Shown in the gutter: a line number, or a position in an ordering. */
  gutter: string;
  marking?: LineMarking;
  onPress?: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  testID?: string;
}

/**
 * One tappable line of code (SPEC §16: debugging and ordering questions; §47).
 *
 * The line never wraps — code that wraps changes meaning to a beginner's eye — so long lines
 * scroll inside the row. The marking is carried by icon and label as well as colour.
 */
export const CodeLine = ({
  text,
  gutter,
  marking = 'none',
  onPress,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: CodeLineProps) => {
  const theme = useTheme();

  const border: Record<LineMarking, string> = {
    none: theme.colors.border,
    selected: theme.colors.primary,
    correct: theme.colors.success,
    wrong: theme.colors.danger,
  };
  const icon: Partial<Record<LineMarking, { name: IconName; color: string }>> = {
    selected: { name: 'radio-button-on', color: theme.colors.primary },
    correct: { name: 'checkmark-circle', color: theme.colors.success },
    wrong: { name: 'close-circle', color: theme.colors.danger },
  };
  const mark = icon[marking];

  return (
    <Pressable
      testID={testID}
      onPress={
        onPress
          ? () => {
              haptics.select();
              onPress();
            }
          : undefined
      }
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected: marking === 'selected', disabled: !onPress }}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: border[marking],
          backgroundColor: theme.colors.codeBackground,
          borderRadius: theme.radius.md,
          minHeight: theme.a11y.minTouchTarget,
          gap: theme.spacing.md,
          paddingHorizontal: theme.spacing.md,
        },
        pressed && onPress && { opacity: theme.pressed.opacity },
      ]}
    >
      <Text variant="monoSmall" tone="secondary" style={styles.gutter}>
        {gutter}
      </Text>
      <View style={styles.code}>
        <Text variant="mono" numberOfLines={1}>
          {text}
        </Text>
      </View>
      {mark && <Icon name={mark.name} size="md" color={mark.color} />}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth * 2 },
  gutter: { minWidth: 24, textAlign: 'right' },
  code: { flex: 1 },
});

import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'danger' | 'warning' | 'streak' | 'xp';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: IconName;
  testID?: string;
}

/**
 * Compact status pill (SPEC §8).
 *
 * Tone always pairs colour with a label, and optionally an icon, so meaning never depends on
 * colour alone (SPEC §47).
 *
 * The label and the icon may be different colours, and for the gamification tones they are.
 * WCAG asks 4.5:1 of text and 3:1 of a graphic (1.4.3, 1.4.11), and the orange that makes a
 * flame read as a flame is not dark enough to be read as a word — `streak` on the warm badge
 * surface is 3.1:1. So the flame keeps the accent and the label takes a colour that can
 * actually be read.
 */
export const Badge = ({ label, tone = 'neutral', icon, testID }: BadgeProps) => {
  const theme = useTheme();

  const tones: Record<BadgeTone, { background: string; foreground: string; graphic?: string }> = {
    neutral: { background: theme.colors.border, foreground: theme.colors.textSecondary },
    accent: { background: theme.colors.primary, foreground: theme.colors.onPrimary },
    success: { background: theme.colors.successSurface, foreground: theme.colors.success },
    danger: { background: theme.colors.dangerSurface, foreground: theme.colors.danger },
    warning: { background: theme.colors.warningSurface, foreground: theme.colors.warning },
    streak: {
      background: theme.colors.warningSurface,
      foreground: theme.colors.warning,
      graphic: theme.colors.streak,
    },
    xp: {
      background: theme.colors.warningSurface,
      foreground: theme.colors.warning,
      graphic: theme.colors.xp,
    },
  };

  const { background, foreground, graphic } = tones[tone];

  return (
    <View
      testID={testID}
      style={[
        styles.root,
        {
          backgroundColor: background,
          borderRadius: theme.radius.pill,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.xs,
          gap: theme.spacing.xs,
        },
      ]}
    >
      {icon && <Icon name={icon} size="sm" color={graphic ?? foreground} />}
      <Text variant="label" style={{ color: foreground }}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
});

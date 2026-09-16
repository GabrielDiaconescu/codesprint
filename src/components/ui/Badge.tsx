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
 */
export const Badge = ({ label, tone = 'neutral', icon, testID }: BadgeProps) => {
  const theme = useTheme();

  const tones: Record<BadgeTone, { background: string; foreground: string }> = {
    neutral: { background: theme.colors.border, foreground: theme.colors.textSecondary },
    accent: { background: theme.colors.primary, foreground: theme.colors.onPrimary },
    success: { background: theme.colors.successSurface, foreground: theme.colors.success },
    danger: { background: theme.colors.dangerSurface, foreground: theme.colors.danger },
    warning: { background: theme.colors.warningSurface, foreground: theme.colors.warning },
    streak: { background: theme.colors.warningSurface, foreground: theme.colors.streak },
    xp: { background: theme.colors.warningSurface, foreground: theme.colors.xp },
  };

  const { background, foreground } = tones[tone];

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
      {icon && <Icon name={icon} size="sm" color={foreground} />}
      <Text variant="label" style={{ color: foreground }}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
});

import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type BadgeTone =
  'neutral' | 'accent' | 'success' | 'danger' | 'warning' | 'streak' | 'xp' | 'challenge';

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
 * colour alone (SPEC §47). Every tone carries a solid 2pt edge in a darker shade of itself,
 * which is what keeps a pill looking like a moulded object rather than a coloured rectangle.
 *
 * The label and the icon may be different colours, and for the gamification tones they are.
 * WCAG asks 4.5:1 of text and 3:1 of a graphic (1.4.3, 1.4.11), and the orange that makes a
 * flame read as a flame is not dark enough to be read as a word — `streak` on the warm badge
 * surface is 3.1:1. So the flame keeps the accent and the label takes a colour that can
 * actually be read.
 */
export const Badge = ({ label, tone = 'neutral', icon, testID }: BadgeProps) => {
  const theme = useTheme();

  const tones: Record<
    BadgeTone,
    { background: string; foreground: string; edge: string; graphic?: string }
  > = {
    neutral: {
      background: theme.colors.border,
      foreground: theme.colors.textSecondary,
      edge: theme.colors.borderStrong,
    },
    accent: {
      background: theme.colors.primary,
      foreground: theme.colors.onPrimary,
      edge: theme.colors.primaryDeep,
    },
    success: {
      background: theme.colors.successSurface,
      foreground: theme.colors.success,
      edge: theme.colors.successFill,
    },
    danger: {
      background: theme.colors.dangerSurface,
      foreground: theme.colors.danger,
      edge: theme.colors.danger,
    },
    warning: {
      background: theme.colors.warningSurface,
      foreground: theme.colors.warning,
      edge: theme.colors.warning,
    },
    challenge: {
      background: theme.colors.challenge,
      foreground: theme.colors.onChallenge,
      edge: theme.colors.challengeDeep,
    },
    streak: {
      background: theme.colors.warningSurface,
      foreground: theme.colors.warning,
      edge: theme.colors.streak,
      graphic: theme.colors.streak,
    },
    xp: {
      background: theme.colors.warningSurface,
      foreground: theme.colors.warning,
      edge: theme.colors.xp,
      graphic: theme.colors.xp,
    },
  };

  const { background, foreground, edge, graphic } = tones[tone];

  return (
    <View
      testID={testID}
      style={[
        styles.root,
        {
          backgroundColor: background,
          borderColor: edge,
          borderRadius: theme.radius.pill,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: 6,
          gap: theme.spacing.xs,
        },
      ]}
    >
      {icon && <Icon name={icon} size="md" color={graphic ?? foreground} />}
      <Text variant="label" style={{ color: foreground }}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 2,
  },
});

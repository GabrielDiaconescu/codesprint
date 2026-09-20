import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type IconButtonTone = 'surface' | 'primary' | 'challenge';

export interface IconButtonProps {
  icon: IconName;
  /** Required: an icon-only control has nothing else to announce (SPEC §47). */
  accessibilityLabel: string;
  onPress?: () => void;
  tone?: IconButtonTone;
  /** A short overlay, e.g. the current language on the language toggle. */
  badge?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const DIAMETER = 48;

/**
 * A round, pressable puck (SPEC §13).
 *
 * The same rim-and-travel treatment as `Button`, in a circle, for the quick toggles that sit
 * in the corner of Home. It is exactly `a11y.minTouchTarget` across, so the smallest control
 * in the app is still the larger of the two platform minimums (44pt iOS, 48dp Android).
 *
 * `badge` exists for the language toggle, which has to show which language is active — an
 * icon alone cannot say "EN".
 */
export const IconButton = ({
  icon,
  accessibilityLabel,
  onPress,
  tone = 'surface',
  badge,
  disabled = false,
  style,
  testID,
}: IconButtonProps) => {
  const theme = useTheme();

  const tones: Record<IconButtonTone, { face: string; rim: string; content: string }> = {
    surface: {
      face: theme.colors.surface,
      rim: theme.colors.surfaceDeep,
      content: theme.colors.textSecondary,
    },
    primary: {
      face: theme.colors.primary,
      rim: theme.colors.primaryDeep,
      content: theme.colors.onPrimary,
    },
    challenge: {
      face: theme.colors.challenge,
      rim: theme.colors.challengeDeep,
      content: theme.colors.onChallenge,
    },
  };

  const { face, rim, content } = tones[tone];
  const lift = disabled ? theme.depth.none : theme.depth.press;

  return (
    <Pressable
      testID={testID}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={6}
      style={[{ paddingBottom: lift }, disabled && styles.disabled, style]}
    >
      {({ pressed }) => (
        <>
          {lift > 0 && <View style={[styles.rim, { top: lift, backgroundColor: rim }]} />}
          <View
            style={[
              styles.face,
              {
                backgroundColor: face,
                borderColor: tone === 'surface' ? theme.colors.border : 'transparent',
                borderWidth: tone === 'surface' ? 2 : 0,
                transform: [{ translateY: pressed && !disabled ? lift : 0 }],
              },
            ]}
          >
            {badge === undefined ? (
              <Icon name={icon} size="lg" color={content} />
            ) : (
              <Text variant="label" style={{ color: content }} numberOfLines={1}>
                {badge}
              </Text>
            )}
          </View>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  rim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: DIAMETER / 2,
  },
  face: {
    width: DIAMETER,
    height: DIAMETER,
    borderRadius: DIAMETER / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.45 },
});

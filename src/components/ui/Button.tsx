import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'challenge' | 'success' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * A button that looks like a physical object (SPEC §8, §47).
 *
 * It is drawn as two stacked boxes: a `Deep`-coloured **rim** behind, and the **face** on top
 * of it. Pressing translates the face down by exactly the rim height, so the rim is swallowed
 * and the thing looks pushed into the page. The container reserves the rim height as padding,
 * which means the button's outer box never changes size — press it and nothing around it
 * moves.
 *
 * **The travel is instant, not animated.** A key does not ease into its own keycap, and a
 * 150 ms spring on the way down is the difference between a button that feels mechanical and
 * one that feels laggy. This also means there is no animation to suppress under reduce-motion:
 * the press is a state change, which SPEC §47 exempts, not a decorative transition.
 *
 * Height never drops below the 48dp minimum touch target, and a loading button stays disabled
 * and keeps its width, so the layout does not jump while an RPC is in flight (SPEC §18).
 */
export const Button = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  testID,
}: ButtonProps) => {
  const theme = useTheme();
  const isInactive = disabled || loading;

  const surface: Record<
    ButtonVariant,
    { face: string; rim: string; content: string; outline?: string }
  > = {
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
    success: {
      face: theme.colors.success,
      rim: theme.colors.successDeep,
      content: theme.colors.textInverse,
    },
    secondary: {
      face: theme.colors.surface,
      rim: theme.colors.surfaceDeep,
      content: theme.colors.textPrimary,
      outline: theme.colors.border,
    },
    // The only flat variant. A tertiary action with a rim would compete with the real one.
    ghost: {
      face: 'transparent',
      rim: 'transparent',
      content: theme.colors.primary,
    },
    danger: {
      face: theme.colors.danger,
      rim: theme.colors.dangerDeep,
      content: theme.colors.textInverse,
    },
  };

  const { face, rim, content, outline } = surface[variant];
  const height = size === 'lg' ? 58 : 52;
  const radius = theme.radius.md;

  // A disabled button must not look pressable, so it loses its rim entirely rather than
  // keeping a dimmed one.
  const lift =
    variant === 'ghost' || isInactive
      ? theme.depth.none
      : size === 'lg'
        ? theme.depth.pressLarge
        : theme.depth.press;

  return (
    <Pressable
      testID={testID}
      onPress={isInactive ? undefined : onPress}
      disabled={isInactive}
      accessibilityRole="button"
      // Kept in the label's own casing — the face is uppercased visually, and a screen reader
      // reading "C-O-N-T-I-N-U-E" is how that trick usually goes wrong.
      accessibilityLabel={label}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      hitSlop={8}
      style={[
        styles.container,
        fullWidth && styles.fullWidth,
        isInactive && styles.inactive,
        style,
      ]}
    >
      {({ pressed }) => (
        <View style={{ paddingBottom: lift }}>
          {lift > 0 && (
            <View
              style={[
                styles.rim,
                { top: lift, backgroundColor: rim, borderRadius: radius },
                // The rim is decoration; the label above it carries the meaning.
              ]}
            />
          )}

          <View
            style={[
              styles.face,
              {
                height,
                paddingHorizontal: size === 'lg' ? theme.spacing.xl : theme.spacing.lg,
                borderRadius: radius,
                backgroundColor: pressed && !isInactive ? shade(variant, theme) : face,
                borderColor: outline ?? 'transparent',
                borderWidth: outline ? 2 : 0,
                gap: theme.spacing.sm,
                transform: [{ translateY: pressed && !isInactive ? lift : 0 }],
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={content} />
            ) : (
              <>
                {icon && iconPosition === 'left' && <Icon name={icon} size="lg" color={content} />}
                <Text variant="label" style={[styles.label, { color: content }]} numberOfLines={1}>
                  {label}
                </Text>
                {icon && iconPosition === 'right' && <Icon name={icon} size="lg" color={content} />}
              </>
            )}
            {/* Keeps the pressable's measured width stable while the spinner is shown. */}
            {loading && <View style={styles.hidden} />}
          </View>
        </View>
      )}
    </Pressable>
  );
};

/**
 * The face colour while held down.
 *
 * Travelling onto the rim is most of the effect, but a face that also shifts one step reads
 * as "lit differently now that it is lower", which is what a real recessed key does.
 *
 * Which direction that step goes is a property of the theme, not of this function: light
 * mode darkens, dark mode lightens. Hard-coding "darker" here made every held button in
 * dark mode unreadable, because the ink on those faces is dark to begin with.
 */
const shade = (variant: ButtonVariant, theme: ReturnType<typeof useTheme>): string => {
  switch (variant) {
    case 'primary':
      return theme.colors.primaryPressed;
    case 'challenge':
      return theme.colors.challengePressed;
    case 'success':
      return theme.colors.successPressed;
    case 'danger':
      return theme.colors.dangerPressed;
    case 'secondary':
      return theme.colors.background;
    default:
      return 'transparent';
  }
};

const styles = StyleSheet.create({
  container: { alignSelf: 'flex-start' },
  fullWidth: { alignSelf: 'stretch' },
  rim: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { textTransform: 'uppercase', letterSpacing: 0.8 },
  inactive: { opacity: 0.45 },
  hidden: { width: 0, height: 0 },
});

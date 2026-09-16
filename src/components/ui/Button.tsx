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

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
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
 * Button (SPEC §8, §47).
 *
 * Height never drops below the 48dp minimum touch target. A loading button stays disabled and
 * keeps its width, so the layout does not jump while an RPC is in flight (SPEC §18).
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

  const surface: Record<ButtonVariant, { background: string; border: string; content: string }> = {
    primary: {
      background: theme.colors.primary,
      border: theme.colors.primary,
      content: theme.colors.onPrimary,
    },
    secondary: {
      background: 'transparent',
      border: theme.colors.border,
      content: theme.colors.textPrimary,
    },
    ghost: {
      background: 'transparent',
      border: 'transparent',
      content: theme.colors.primary,
    },
    danger: {
      background: theme.colors.danger,
      border: theme.colors.danger,
      content: theme.colors.textInverse,
    },
  };

  const { background, border, content } = surface[variant];
  const height = size === 'lg' ? 56 : theme.a11y.minTouchTarget;

  return (
    <Pressable
      testID={testID}
      onPress={isInactive ? undefined : onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.root,
        {
          height,
          paddingHorizontal: size === 'lg' ? theme.spacing.xl : theme.spacing.lg,
          borderRadius: theme.radius.md,
          backgroundColor: background,
          borderColor: border,
          gap: theme.spacing.sm,
        },
        fullWidth && styles.fullWidth,
        isInactive && styles.inactive,
        pressed && !isInactive && { opacity: theme.pressed.opacity },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={content} />
      ) : (
        <>
          {icon && iconPosition === 'left' && <Icon name={icon} size="md" color={content} />}
          <Text variant="bodyStrong" style={{ color: content }} numberOfLines={1}>
            {label}
          </Text>
          {icon && iconPosition === 'right' && <Icon name={icon} size="md" color={content} />}
        </>
      )}
      {/* Keeps the pressable's measured width stable while the spinner is shown. */}
      {loading && <View style={styles.hidden} />}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  fullWidth: { alignSelf: 'stretch' },
  inactive: { opacity: 0.45 },
  hidden: { width: 0, height: 0 },
});

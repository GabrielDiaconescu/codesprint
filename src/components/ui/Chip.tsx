import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  disabled?: boolean;
  testID?: string;
}

/**
 * Selectable chip (SPEC §8) — onboarding answers, filters, token banks.
 *
 * Selection is announced through accessibilityState, not implied by colour (SPEC §47).
 */
export const Chip = ({ label, selected = false, onPress, icon, disabled, testID }: ChipProps) => {
  const theme = useTheme();

  return (
    <Pressable
      testID={testID}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!disabled }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.root,
        {
          minHeight: theme.a11y.minTouchTarget,
          borderRadius: theme.radius.pill,
          paddingHorizontal: theme.spacing.lg,
          gap: theme.spacing.sm,
          backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
        },
        disabled && styles.disabled,
        pressed && !disabled && { opacity: theme.pressed.opacity },
      ]}
    >
      {icon && (
        <Icon
          name={icon}
          size="sm"
          color={selected ? theme.colors.onPrimary : theme.colors.textSecondary}
        />
      )}
      <Text
        variant="bodySmall"
        style={{ color: selected ? theme.colors.onPrimary : theme.colors.textPrimary }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  disabled: { opacity: 0.45 },
});

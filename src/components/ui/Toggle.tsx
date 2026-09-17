import { StyleSheet, Switch, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export interface ToggleProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  testID?: string;
}

/**
 * Labelled switch (SPEC §8, §29, §47).
 *
 * The label and description are bound to the switch through `accessibilityLabel` rather than
 * sitting beside it as loose text, so a screen reader announces what is being switched — a
 * bare "on, switch" tells a user nothing about which setting they just changed.
 *
 * Built on React Native's own Switch: it is the platform control, already themed for light and
 * dark, and already correct for assistive technology.
 */
export const Toggle = ({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  testID,
}: ToggleProps) => {
  const theme = useTheme();

  return (
    <View style={[styles.row, { gap: theme.spacing.lg, opacity: disabled ? 0.5 : 1 }]}>
      <View style={[styles.text, { gap: theme.spacing.xs }]}>
        <Text variant="bodyStrong">{label}</Text>
        {description && (
          <Text variant="caption" tone="secondary">
            {description}
          </Text>
        )}
      </View>

      <Switch
        testID={testID}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={description ? `${label}. ${description}` : label}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor={theme.colors.surface}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  text: { flex: 1 },
});

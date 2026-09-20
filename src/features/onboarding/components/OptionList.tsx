import { StyleSheet, View } from 'react-native';

import { Card, Icon, Text, type IconName } from '@/components/ui';
import { useTheme } from '@/theme';

export interface Option<T extends string | number> {
  value: T;
  label: string;
  description?: string;
  icon?: IconName;
}

interface OptionListProps<T extends string | number> {
  options: Option<T>[];
  selected: T | undefined;
  onSelect: (value: T) => void;
  testIDPrefix?: string;
}

/**
 * Single-select list used by every choice step (SPEC §8, §47).
 *
 * Selection is shown by a border, a tinted surface AND a check icon rather than colour alone,
 * because colour is not available to every user (SPEC §47). Each row is a `radio` carrying its
 * own checked state, so a screen reader announces the choice and whether it is selected — a
 * list of plain buttons would announce neither.
 */
export const OptionList = <T extends string | number>({
  options,
  selected,
  onSelect,
  testIDPrefix = 'option',
}: OptionListProps<T>) => {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }} accessibilityRole="radiogroup">
      {options.map((option) => {
        const isSelected = option.value === selected;

        return (
          <Card
            key={String(option.value)}
            testID={`${testIDPrefix}-${option.value}`}
            appearance="outlined"
            onPress={() => onSelect(option.value)}
            accessibilityRole="radio"
            selected={isSelected}
            accessibilityLabel={
              option.description ? `${option.label}. ${option.description}` : option.label
            }
            style={
              isSelected
                ? {
                    borderColor: theme.colors.primary,
                    backgroundColor: theme.colors.surfaceElevated,
                  }
                : undefined
            }
          >
            <View style={[styles.row, { gap: theme.spacing.md }]}>
              {option.icon && (
                <Icon
                  name={option.icon}
                  size="lg"
                  color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                />
              )}

              <View style={[styles.text, { gap: theme.spacing.xs }]}>
                <Text variant="bodyStrong">{option.label}</Text>
                {option.description && (
                  <Text variant="caption" tone="secondary">
                    {option.description}
                  </Text>
                )}
              </View>

              <Icon
                // Outline on purpose: an empty ring is how an unchosen option reads.
                name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                size="lg"
                color={isSelected ? theme.colors.primary : theme.colors.border}
              />
            </View>
          </Card>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1 },
});

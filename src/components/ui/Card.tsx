import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  /** `elevated` lifts the card off the background; `outlined` stays flat. */
  appearance?: 'elevated' | 'outlined';
  padding?: 'none' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

/** Surface container (SPEC §8). Becomes a button only when `onPress` is supplied. */
export const Card = ({
  children,
  onPress,
  appearance = 'elevated',
  padding = 'lg',
  style,
  accessibilityLabel,
  testID,
}: CardProps) => {
  const theme = useTheme();

  const paddingValue = padding === 'none' ? 0 : theme.spacing[padding];

  const base: StyleProp<ViewStyle> = [
    styles.root,
    {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: paddingValue,
      borderColor: theme.colors.border,
      borderWidth: appearance === 'outlined' ? StyleSheet.hairlineWidth * 2 : 0,
    },
    appearance === 'elevated' && {
      // Shadow on iOS, elevation on Android — both derive from the same token.
      shadowColor: '#000',
      shadowOpacity: theme.scheme === 'dark' ? 0.4 : 0.08,
      shadowRadius: theme.elevation.medium,
      shadowOffset: { width: 0, height: 2 },
      elevation: theme.elevation.low,
    },
    style,
  ];

  if (!onPress) {
    return (
      <View style={base} testID={testID}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, pressed && { opacity: theme.pressed.opacity }]}
    >
      {children}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
});

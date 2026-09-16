import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

/**
 * Minimal layout primitive so Phase 1 screens use real structure rather than ad-hoc styling.
 * The full design-system component library (buttons, cards, CodeBlock, feedback panel)
 * is Phase 2 (SPEC §8).
 */
export const Screen = ({ children }: { children: ReactNode }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingHorizontal: theme.spacing.lg,
        },
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
});

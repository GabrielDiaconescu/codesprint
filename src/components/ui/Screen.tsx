import { HeaderHeightContext } from 'expo-router/react-navigation';
import { useContext, type ReactNode } from 'react';
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
  // Under a navigation header the status bar is the header's to clear, and it already has.
  // Padding for it again left an empty band under every header — Learn, Progress, a lesson —
  // which the Phase 23 store screenshots made hard to miss. No header (Home, onboarding, a
  // modal): the screen clears the status bar itself. Outside any navigator the context is
  // simply empty.
  const headerHeight = useContext(HeaderHeightContext) ?? 0;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.background,
          paddingTop: headerHeight > 0 ? 0 : insets.top,
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

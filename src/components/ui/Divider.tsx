import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

export const Divider = ({ inset = 0 }: { inset?: number }) => {
  const theme = useTheme();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.root, { backgroundColor: theme.colors.border, marginHorizontal: inset }]}
    />
  );
};

const styles = StyleSheet.create({
  root: { height: StyleSheet.hairlineWidth * 2, width: '100%' },
});

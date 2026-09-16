import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';

/**
 * Honest empty state for screens whose feature has not shipped yet (SPEC §59.12: never
 * present mocked data as real). It states plainly what will appear here and when.
 */
export const PlaceholderState = ({ title, body }: { title: string; body: string }) => {
  const theme = useTheme();

  return (
    <View style={styles.root}>
      <Text
        accessibilityRole="header"
        style={[theme.typography.heading, styles.title, { color: theme.colors.textPrimary }]}
      >
        {title}
      </Text>
      <Text style={[theme.typography.body, styles.body, { color: theme.colors.textSecondary }]}>
        {body}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { textAlign: 'center' },
  body: { textAlign: 'center', maxWidth: 320 },
});

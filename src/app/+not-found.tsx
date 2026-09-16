import { Link, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui';
import { useTheme } from '@/theme';

export default function NotFoundScreen() {
  const { t } = useTranslation('common');
  const theme = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: t('states.errorTitle') }} />
      <Screen>
        <View style={styles.root}>
          <Text
            accessibilityRole="header"
            style={[theme.typography.heading, { color: theme.colors.textPrimary }]}
          >
            {t('states.errorTitle')}
          </Text>
          <Link href="/" style={[theme.typography.bodyStrong, { color: theme.colors.primary }]}>
            {t('actions.continue')}
          </Link>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
});

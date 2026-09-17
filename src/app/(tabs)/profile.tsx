import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, PlaceholderState, Screen } from '@/components/ui';
import { SessionCard } from '@/features/auth/components/SessionCard';
import { useTheme } from '@/theme';

export default function ProfileScreen() {
  const { t } = useTranslation('profile');
  const theme = useTheme();

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.content, { gap: theme.spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <SessionCard />

        <PlaceholderState title={t('placeholder.title')} body={t('placeholder.body')} />
      </ScrollView>

      {/* Development-only entry point to the design-system gallery (SPEC §57, Phase 2).
          __DEV__ is false in every release build, so this never reaches a user. */}
      {__DEV__ && (
        <View style={styles.devTools}>
          <Link href="/gallery" asChild>
            <Button label="Component gallery (dev)" variant="ghost" icon="color-palette-outline" />
          </Link>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16 },
  devTools: { paddingBottom: 16, alignItems: 'center' },
});

import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, PlaceholderState, Screen } from '@/components/ui';

export default function ProfileScreen() {
  const { t } = useTranslation('profile');

  return (
    <Screen>
      <PlaceholderState title={t('placeholder.title')} body={t('placeholder.body')} />

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
  devTools: { paddingBottom: 16, alignItems: 'center' },
});

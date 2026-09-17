import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { PlaceholderState, Screen } from '@/components/ui';
import { BackendStatusCard } from '@/features/config/components/BackendStatusCard';

export default function HomeScreen() {
  const { t } = useTranslation('home');

  return (
    <Screen>
      <PlaceholderState title={t('placeholder.title')} body={t('placeholder.body')} />

      {/* Development-only proof that config comes from the database (SPEC §57, Phase 3).
          __DEV__ is false in every release build, so this never reaches a user. */}
      {__DEV__ && (
        <View style={styles.devPanel}>
          <BackendStatusCard />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  devPanel: { paddingBottom: 16 },
});

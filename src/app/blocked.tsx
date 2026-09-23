import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Screen, StateView } from '@/components/ui';
import { useAppConfig } from '@/features/config/hooks/useAppConfig';

/**
 * Shown when the age gate refuses an account (SPEC §11, §41, D10).
 *
 * A terminal screen with no way onward. By the time this renders the account has already been
 * deleted and the session cleared, so there is nothing to sign out of and nothing stored.
 *
 * The wording avoids blame and says plainly that nothing was kept — the reader may well be a
 * child, and "access denied" is the wrong tone for someone who answered honestly.
 */
export default function BlockedScreen() {
  const { t } = useTranslation('onboarding');
  const { data: config } = useAppConfig();

  return (
    <Screen>
      <View style={styles.centre}>
        <StateView
          testID="age-blocked"
          icon="hourglass"
          title={t('blocked.title')}
          body={t('blocked.body', { minAge: config.min_user_age })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

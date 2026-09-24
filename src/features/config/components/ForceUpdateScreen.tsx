import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';

import { Screen, StateView } from '@/components/ui';
import { useCaptureOnce } from '@/features/analytics/hooks/useAnalytics';

/**
 * The one screen a retired build shows (SPEC §50, §51).
 *
 * It says why, promises what matters — progress lives on the server, so nothing is lost — and
 * offers the store listing. Without a listing to link (iOS, before the App Store id is set in
 * `app_config`) it says where to look instead of showing a button that goes nowhere.
 */
export const ForceUpdateScreen = ({ url }: { url: string | null }) => {
  const { t } = useTranslation('common');
  useCaptureOnce('force_update_shown');

  return (
    <Screen>
      <View style={styles.centre}>
        <StateView
          testID="force-update"
          icon="cloud-download"
          title={t('forceUpdate.title')}
          body={t(url ? 'forceUpdate.body' : 'forceUpdate.bodyNoLink')}
          actionLabel={url ? t('forceUpdate.action') : undefined}
          onAction={url ? () => void Linking.openURL(url) : undefined}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

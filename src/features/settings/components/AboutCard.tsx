import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { BRAND } from '@/constants/brand';
import { getEnv } from '@/lib/env';
import { useTheme } from '@/theme';

import { appVersionLabel } from '../logic/version';

/**
 * The version line (SPEC §29).
 *
 * Small, and the first thing support asks for. The legal links that will sit beside it —
 * privacy policy, terms, licences — arrive with Phase 18, together with the pages they point
 * at; a link to a page that does not exist yet would be worse than no link.
 */
export const AboutCard = () => {
  const { t } = useTranslation('settings');
  const theme = useTheme();

  const manifest = Constants.expoConfig;
  const label = appVersionLabel({
    version: manifest?.version ?? null,
    build: manifest?.ios?.buildNumber ?? manifest?.android?.versionCode ?? null,
    environment: getEnv().EXPO_PUBLIC_APP_ENV,
  });

  return (
    <Card testID="about-settings" appearance="outlined">
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="bodyStrong">{t('about.title')}</Text>
        <Text variant="caption" tone="secondary" testID="app-version">
          {BRAND.name} · {t('about.version', { value: label })}
        </Text>
      </View>
    </Card>
  );
};

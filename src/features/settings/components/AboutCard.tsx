import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { BRAND } from '@/constants/brand';
import { getEnv } from '@/lib/env';
import { useTheme } from '@/theme';

import { appVersionLabel } from '../logic/version';
import { LegalLinks } from './LegalLinks';

/**
 * The version line (SPEC §29).
 *
 * Small, and the first thing support asks for — next to the legal and support pages (SPEC §29,
 * Phase 18), which appear once they are hosted for this environment.
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
        <LegalLinks links={['privacy', 'terms', 'support']} />
      </View>
    </Card>
  );
};

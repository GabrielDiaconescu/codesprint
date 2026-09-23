import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card, Chip, Text } from '@/components/ui';
import { showLanguageToggle } from '@/features/home/logic/header';
import { FALLBACK_LOCALE, SUPPORTED_LOCALES, type LanguagePreference } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import { useTheme } from '@/theme';

const PREFERENCES: LanguagePreference[] = ['system', ...SUPPORTED_LOCALES];

/**
 * The language setting (SPEC §29, §38).
 *
 * Hidden until a second locale ships — the same condition as the toggle on Home — so it can
 * never be a picker with one entry.
 *
 * Each language is listed in its own language ("English", "Română") in every locale. Someone
 * who switched to a language they cannot read has to be able to find their way back.
 *
 * The note about lessons is honest about the current state: the interface is translated,
 * lesson content is not yet, and the server falls back to English for it.
 */
export const LanguageSettingsCard = () => {
  const { t, i18n } = useTranslation('settings');
  const theme = useTheme();

  const languagePreference = useSettingsStore((state) => state.languagePreference);
  const setLanguagePreference = useSettingsStore((state) => state.setLanguagePreference);

  if (!showLanguageToggle(SUPPORTED_LOCALES)) return null;

  return (
    <Card testID="language-settings">
      <View style={{ gap: theme.spacing.md }}>
        <Text variant="bodyStrong">{t('language.title')}</Text>

        <Text variant="body" tone="secondary">
          {t('language.label')}
        </Text>

        <View style={[styles.options, { gap: theme.spacing.sm }]}>
          {PREFERENCES.map((preference) => (
            <Chip
              key={preference}
              testID={`language-${preference}`}
              label={
                preference === 'system' ? t('language.system') : t(`language.names.${preference}`)
              }
              selected={languagePreference === preference}
              onPress={() => setLanguagePreference(preference)}
            />
          ))}
        </View>

        {i18n.language !== FALLBACK_LOCALE && (
          <Text testID="language-content-note" variant="caption" tone="secondary">
            {t('language.contentNote')}
          </Text>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap' },
});

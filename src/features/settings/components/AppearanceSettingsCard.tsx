import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card, Chip, Divider, Text, Toggle } from '@/components/ui';
import { useSettingsStore, type ThemePreference } from '@/store/settingsStore';
import { useTheme } from '@/theme';

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

/**
 * Appearance and feedback (SPEC §29).
 *
 * Both settings belong to this device and are stored on it. "System" is the default and the
 * first option, because matching the phone is what most people want and the other two exist
 * for the people who do not.
 *
 * Not here: sound. There are no sounds in the build, and a switch for a thing that does not
 * happen is worse than no switch — see `docs/PROGRESS.md`.
 */
export const AppearanceSettingsCard = () => {
  const { t } = useTranslation('settings');
  const theme = useTheme();

  const themePreference = useSettingsStore((state) => state.themePreference);
  const setThemePreference = useSettingsStore((state) => state.setThemePreference);
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);
  const setHapticsEnabled = useSettingsStore((state) => state.setHapticsEnabled);

  return (
    <Card testID="appearance-settings">
      <View style={{ gap: theme.spacing.lg }}>
        <Text variant="bodyStrong">{t('appearance.title')}</Text>

        <View style={{ gap: theme.spacing.md }}>
          <Text variant="body" tone="secondary">
            {t('appearance.theme.label')}
          </Text>
          <View style={[styles.themes, { gap: theme.spacing.sm }]}>
            {THEMES.map((preference) => (
              <Chip
                key={preference}
                testID={`theme-${preference}`}
                label={t(`appearance.theme.${preference}`)}
                selected={themePreference === preference}
                onPress={() => setThemePreference(preference)}
              />
            ))}
          </View>
        </View>

        <Divider />

        <Toggle
          testID="haptics-toggle"
          label={t('appearance.haptics.label')}
          description={t('appearance.haptics.description')}
          value={hapticsEnabled}
          onValueChange={setHapticsEnabled}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  themes: { flexDirection: 'row', flexWrap: 'wrap' },
});

import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { IconButton, Text } from '@/components/ui';
import { resources } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import { useTheme } from '@/theme';

import { greeting, nextLocale, nextScheme, showLanguageToggle } from '../logic/header';

const LOCALES = Object.keys(resources);

/**
 * Home's top bar (SPEC §13).
 *
 * The screen's name on the left with the welcome under it, and the three quick toggles on the
 * right — the settings a learner actually reaches for mid-session, without a trip through
 * Profile.
 *
 * The language toggle is built but only rendered once a second locale ships, which is the same
 * condition SPEC §29 and §38 put on the Settings entry. Shipping it hidden means the day
 * Romanian lands it is already here, tested, and sized into the layout.
 */
export const HomeHeader = ({ displayName }: { displayName: string | null | undefined }) => {
  const { t } = useTranslation('home');
  const { i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const setThemePreference = useSettingsStore((state) => state.setThemePreference);

  const hello = greeting(displayName);
  const isDark = theme.scheme === 'dark';

  return (
    <View style={[styles.root, { gap: theme.spacing.md }]}>
      <View style={styles.titles}>
        <Text variant="title" heading>
          {t('title')}
        </Text>
        <Text variant="body" tone="secondary">
          {hello.key === 'greeting.named' ? t(hello.key, { name: hello.name }) : t(hello.key)}
        </Text>
      </View>

      <View style={[styles.toggles, { gap: theme.spacing.sm }]}>
        {showLanguageToggle(LOCALES) && (
          <IconButton
            testID="home-language"
            icon="language"
            badge={i18n.language.slice(0, 2).toUpperCase()}
            accessibilityLabel={t('toggles.language')}
            onPress={() => void i18n.changeLanguage(nextLocale(i18n.language, LOCALES))}
          />
        )}

        <IconButton
          testID="home-theme"
          icon={isDark ? 'sunny' : 'moon'}
          accessibilityLabel={t(isDark ? 'toggles.themeLight' : 'toggles.themeDark')}
          onPress={() => setThemePreference(nextScheme(theme.scheme))}
        />

        <IconButton
          testID="home-settings"
          icon="settings"
          accessibilityLabel={t('toggles.settings')}
          onPress={() => router.push('/profile')}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'flex-start' },
  titles: { flex: 1 },
  // Wraps rather than squashing: at the largest accessibility font size the title needs the
  // width more than the toggles do.
  toggles: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
});

import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { getEnv } from '@/lib/env';
import { useTheme } from '@/theme';

import { legalUrls, type LegalUrls } from '../logic/legalUrls';

type LegalLink = keyof Pick<LegalUrls, 'privacy' | 'terms' | 'support' | 'licenses'>;

/**
 * Links to the static legal and support pages (SPEC §29, §33).
 *
 * Nothing at all when the pages are not hosted in this environment: a link to nowhere is worse
 * than no link. Each is a real link for a screen reader, with a touch target of at least 44 pt
 * (SPEC §47) — a line of caption text is not enough on its own.
 */
export const LegalLinks = ({ links }: { links: readonly LegalLink[] }) => {
  const { t, i18n } = useTranslation('settings');
  const theme = useTheme();
  const urls = legalUrls(getEnv().EXPO_PUBLIC_LEGAL_BASE_URL, i18n.language);

  if (!urls) return null;

  return (
    <View style={[styles.row, { columnGap: theme.spacing.lg }]}>
      {links.map((link) => (
        <Text
          key={link}
          testID={`legal-${link}`}
          variant="caption"
          tone="accent"
          accessibilityRole="link"
          style={styles.link}
          onPress={() => void Linking.openURL(urls[link])}
        >
          {t(`legal.${link}`)}
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  link: { minHeight: 44, paddingVertical: 12 },
});

import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { services } from '@/services';
import { a11y, palettes, radius, spacing, typography } from '@/theme';

/**
 * Expo Router error boundary (SPEC §46).
 *
 * Shows a localized, understandable message — never raw error text — and offers Retry.
 * The technical detail goes to MonitoringService (Sentry), scrubbed of PII (SPEC §44).
 *
 * This component cannot use useTheme(): it may render when providers above it have failed,
 * so it reads the light palette directly and stays intentionally dependency-free.
 */
export const ErrorBoundary = ({ error, retry }: { error: Error; retry: () => Promise<void> }) => {
  const { t } = useTranslation('common');
  const colors = palettes.light;

  services.monitoring.captureException(error, { boundary: 'route' });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Text accessibilityRole="header" style={[typography.title, { color: colors.textPrimary }]}>
        {t('states.errorTitle')}
      </Text>
      <Text style={[typography.body, styles.body, { color: colors.textSecondary }]}>
        {t('states.errorBody')}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void retry()}
        style={[styles.button, { backgroundColor: colors.primary }]}
      >
        <Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>
          {t('actions.retry')}
        </Text>
      </Pressable>
    </View>
  );
};
const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  body: { textAlign: 'center', maxWidth: 320 },
  button: {
    minHeight: a11y.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
});

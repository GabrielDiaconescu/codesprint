import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Card, Divider, Text, Toggle } from '@/components/ui';
import { useAppConfig } from '@/features/config/hooks/useAppConfig';
import { classifyAge } from '@/features/onboarding/logic/age';
import { queryKeys } from '@/lib/queryClient';
import { services, type UserProfile } from '@/services';
import { useSessionStore } from '@/store/sessionStore';
import { useToastStore } from '@/store/toastStore';
import { useTheme } from '@/theme';

export interface PrivacySettingsCardProps {
  profile: UserProfile;
}

/**
 * Privacy controls, on the Profile screen (SPEC §29, §41).
 *
 * Two things live here, and they are separate on purpose:
 *
 *   * **analytics**, which is opt-IN and off until the learner says otherwise;
 *   * **ad personalisation**, which is UMP's to manage — the button reopens Google's own form,
 *     because that is the entry point UMP requires and the only place consent can be withdrawn
 *     in a way the ad network actually honours.
 *
 * For a learner under `minor_protection_age` the analytics toggle is disabled with the reason
 * shown. The server forces `analytics_consent` to false for them whatever the client sends
 * (SPEC §41), so a live switch would flick on and snap back — which reads as a broken app
 * rather than as a protection.
 */
export const PrivacySettingsCard = ({ profile }: PrivacySettingsCardProps) => {
  const { t } = useTranslation('privacy');
  const theme = useTheme();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.show);
  const userId = useSessionStore((state) => state.userId);
  const { data: config } = useAppConfig();

  // Fails closed on an unknown birth year, exactly as `public.is_minor()` does.
  const isProtectedMinor =
    profile.birthYear === null ||
    classifyAge(profile.birthYear, {
      minUserAge: config.min_user_age,
      minorProtectionAge: config.minor_protection_age,
    }) === 'protected-minor';

  const setAnalytics = useMutation<void, Error, boolean>({
    mutationFn: async (granted) => {
      // The profile is the authority; the SDK is told afterwards, so a refused write never
      // leaves analytics running (SPEC §41).
      await services.profile.update({ analyticsConsent: granted });
      services.analytics.setConsent(granted);
      await services.consent.setAnalyticsConsent(granted);
      services.analytics.capture('consent_updated', { analytics: granted });
    },
    onSuccess: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(userId) });
    },
    onError: () => showToast({ message: t('failed'), tone: 'error' }),
  });

  return (
    <Card testID="privacy-settings">
      <View style={{ gap: theme.spacing.lg }}>
        <Text variant="bodyStrong">{t('title')}</Text>

        <Toggle
          testID="analytics-consent-toggle"
          label={t('analytics.label')}
          description={
            isProtectedMinor
              ? t('analytics.minor', { age: config.minor_protection_age })
              : t('analytics.description')
          }
          value={isProtectedMinor ? false : profile.analyticsConsent}
          disabled={isProtectedMinor || setAnalytics.isPending}
          onValueChange={(granted) => setAnalytics.mutate(granted)}
        />

        <Divider />

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="body" tone="secondary">
            {t('ads.description')}
          </Text>
          <Button
            testID="privacy-options"
            label={t('ads.action')}
            variant="secondary"
            icon="options"
            onPress={() => void services.consent.openPrivacyOptions()}
            fullWidth
          />
        </View>
      </View>
    </Card>
  );
};

import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card, Divider, Icon, Text, Toggle } from '@/components/ui';
import { useAppConfig } from '@/features/config/hooks/useAppConfig';
import { AuthErrorBanner } from '@/features/auth/components/AuthScreen';
import { OnboardingStepScreen } from '@/features/onboarding/components/OnboardingStepScreen';
import { useCompleteOnboarding } from '@/features/onboarding/hooks/useOnboarding';
import { classifyAge } from '@/features/onboarding/logic/age';
import { isComplete } from '@/features/onboarding/logic/steps';
import { useOnboardingStore } from '@/features/onboarding/store';
import { useTheme } from '@/theme';

/**
 * Privacy choices, and the end of the flow (SPEC §11, §41).
 *
 * For a user below `minor_protection_age` the analytics toggle is shown OFF and disabled,
 * with an explanation. It is not hidden: a protection nobody can see looks like a setting that
 * was never offered. The toggle being disabled is cosmetic — the database forces the same
 * three defaults regardless of what this screen sends (`update_profile`).
 *
 * Ads consent is not asked here. That is Google UMP's own form, which must be shown before the
 * first ad request, and it arrives with the ads integration in Phase 15.
 */
export default function ConsentStep() {
  const { t } = useTranslation('onboarding');
  const theme = useTheme();

  const { data: config } = useAppConfig();
  const draft = useOnboardingStore((state) => state.draft);
  const setAnalyticsConsent = useOnboardingStore((state) => state.setAnalyticsConsent);

  const completeOnboarding = useCompleteOnboarding();

  const isMinor =
    draft.birthYear === undefined ||
    classifyAge(draft.birthYear, {
      minUserAge: config.min_user_age,
      minorProtectionAge: config.minor_protection_age,
    }) === 'protected-minor';

  const analyticsConsent = isMinor ? false : (draft.analyticsConsent ?? false);

  const submit = () => {
    const answers = { ...draft, analyticsConsent };
    // The router leaves onboarding as soon as the returned profile says it is complete.
    if (isComplete(answers)) completeOnboarding.mutate(answers);
  };

  return (
    <OnboardingStepScreen
      step="consent"
      title={t('consent.title')}
      subtitle={t('consent.subtitle')}
      continueLabel={t('consent.finish')}
      onContinue={submit}
      busy={completeOnboarding.isPending}
    >
      {completeOnboarding.isError && (
        <AuthErrorBanner message={t('common:states.errorBody', { ns: 'common' })} />
      )}

      <Card appearance="outlined">
        <Toggle
          testID="consent-analytics"
          label={t('consent.analytics.label')}
          description={t('consent.analytics.description')}
          value={analyticsConsent}
          onValueChange={setAnalyticsConsent}
          disabled={isMinor}
        />

        {isMinor && (
          <>
            <Divider />
            <View style={[styles.note, { gap: theme.spacing.sm }]}>
              <Icon name="shield-checkmark" size="md" color={theme.colors.success} />
              <Text variant="caption" tone="secondary" style={styles.flex}>
                {t('consent.minorNotice', { protectionAge: config.minor_protection_age })}
              </Text>
            </View>
          </>
        )}
      </Card>

      <View style={[styles.note, { gap: theme.spacing.sm }]}>
        <Icon name="information-circle-outline" size="md" color={theme.colors.textSecondary} />
        <Text variant="caption" tone="secondary" style={styles.flex}>
          {t('consent.adsNote')}
        </Text>
      </View>
    </OnboardingStepScreen>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
});

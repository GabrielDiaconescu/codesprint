import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { OnboardingStepScreen } from '@/features/onboarding/components/OnboardingStepScreen';
import { OptionList, type Option } from '@/features/onboarding/components/OptionList';
import { useRequestNotificationPermission } from '@/features/notifications/hooks/useNotificationPermission';
import { REMINDER_TIMES } from '@/features/notifications/logic/schedule';
import { useOnboardingStore } from '@/features/onboarding/store';
import { useTheme } from '@/theme';

/**
 * Reminder time (SPEC §11, §48).
 *
 * Preset times rather than a wheel picker. A native date-time picker is a whole extra native
 * dependency for a question whose useful answers are "morning", "after work" and "before bed"
 * — and five taps beats scrolling two wheels on a phone.
 *
 * The OS permission is requested on Continue, and only when a time was actually chosen —
 * SPEC §11 requires the explanation before the prompt, and this screen IS that explanation.
 * Skipping asks for nothing: there is no reminder to deliver, so there is no reason to spend
 * the one prompt the platform allows.
 *
 * Nothing is scheduled here either. The reconciler does that once the answers are saved, so
 * scheduling happens in exactly one place in the app.
 */

export default function ReminderStep() {
  const { t } = useTranslation('onboarding');
  const theme = useTheme();
  const router = useRouter();

  const selected = useOnboardingStore((state) => state.draft.reminderTime);
  const setReminderTime = useOnboardingStore((state) => state.setReminderTime);

  const options: Option<string>[] = REMINDER_TIMES.map((time) => ({
    value: time,
    label: t(`reminder.options.${time}.label`),
    description: t(`reminder.options.${time}.description`),
    icon: 'alarm-outline',
  }));

  const requestPermission = useRequestNotificationPermission();

  const goOn = () => router.push('/consent');

  const continueWithReminder = async () => {
    // A refusal is not a failure: the answers are still saved, reminders simply stay off
    // until the learner switches them on in Settings.
    await requestPermission('onboarding').catch(() => false);
    goOn();
  };

  return (
    <OnboardingStepScreen
      step="reminder"
      title={t('reminder.title')}
      subtitle={t('reminder.subtitle')}
      canContinue={selected !== undefined && selected !== null}
      onContinue={() => void continueWithReminder()}
      skipLabel={t('reminder.skip')}
      onSkip={() => {
        // null is a real answer — "no reminder" — not an unanswered step.
        setReminderTime(null);
        goOn();
      }}
    >
      <OptionList
        testIDPrefix="reminder"
        options={options}
        selected={selected ?? undefined}
        onSelect={setReminderTime}
      />

      <View style={[styles.note, { gap: theme.spacing.sm }]}>
        <Icon name="information-circle-outline" size="md" color={theme.colors.textSecondary} />
        <Text variant="caption" tone="secondary" style={styles.flex}>
          {t('reminder.explanation')}
        </Text>
      </View>
    </OnboardingStepScreen>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
});

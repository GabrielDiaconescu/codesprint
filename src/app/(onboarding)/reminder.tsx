import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { OnboardingStepScreen } from '@/features/onboarding/components/OnboardingStepScreen';
import { OptionList, type Option } from '@/features/onboarding/components/OptionList';
import { useOnboardingStore } from '@/features/onboarding/store';
import { useTheme } from '@/theme';

/**
 * Reminder time (SPEC §11, §48).
 *
 * Preset times rather than a wheel picker. A native date-time picker is a whole extra native
 * dependency for a question whose useful answers are "morning", "after work" and "before bed"
 * — and five taps beats scrolling two wheels on a phone.
 *
 * Nothing is scheduled here and no permission is requested yet. SPEC §11 requires the
 * explanation to come before the OS prompt; the prompt itself belongs to Phase 17, where the
 * notification service becomes real. Promising a reminder we cannot yet deliver would be
 * exactly the kind of fake integration SPEC §59.11 forbids, so the copy commits to asking,
 * not to notifying.
 */
const REMINDER_TIMES = ['08:00', '12:00', '18:00', '20:00', '21:30'] as const;

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

  const goOn = () => router.push('/consent');

  return (
    <OnboardingStepScreen
      step="reminder"
      title={t('reminder.title')}
      subtitle={t('reminder.subtitle')}
      canContinue={selected !== undefined && selected !== null}
      onContinue={goOn}
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

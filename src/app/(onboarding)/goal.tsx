import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OnboardingStepScreen } from '@/features/onboarding/components/OnboardingStepScreen';
import { OptionList, type Option } from '@/features/onboarding/components/OptionList';
import { useOnboardingStore } from '@/features/onboarding/store';
import { DAILY_GOAL_MINUTES, type DailyGoalMinutes } from '@/services';

/**
 * Daily goal (SPEC §11).
 *
 * Minutes are what the user picks and what reads naturally; they are never measured. The
 * server turns the choice into an XP target through the `daily_goal_xp` config map, so the
 * goal is met by doing the work rather than by leaving the app open.
 */
export default function GoalStep() {
  const { t } = useTranslation('onboarding');
  const router = useRouter();

  const selected = useOnboardingStore((state) => state.draft.dailyGoalMinutes);
  const setDailyGoal = useOnboardingStore((state) => state.setDailyGoal);

  const options: Option<DailyGoalMinutes>[] = DAILY_GOAL_MINUTES.map((minutes) => ({
    value: minutes,
    label: t(`goal.options.${minutes}.label`),
    description: t(`goal.options.${minutes}.description`),
  }));

  return (
    <OnboardingStepScreen
      step="goal"
      title={t('goal.title')}
      subtitle={t('goal.subtitle')}
      canContinue={selected !== undefined}
      onContinue={() => router.push('/reminder')}
    >
      <OptionList
        testIDPrefix="goal"
        options={options}
        selected={selected}
        onSelect={setDailyGoal}
      />
    </OnboardingStepScreen>
  );
}

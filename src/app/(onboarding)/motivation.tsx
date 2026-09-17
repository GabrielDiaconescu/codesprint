import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OnboardingStepScreen } from '@/features/onboarding/components/OnboardingStepScreen';
import { OptionList, type Option } from '@/features/onboarding/components/OptionList';
import { useOnboardingStore } from '@/features/onboarding/store';
import { MOTIVATIONS, type Motivation } from '@/services';

export default function MotivationStep() {
  const { t } = useTranslation('onboarding');
  const router = useRouter();

  const selected = useOnboardingStore((state) => state.draft.motivation);
  const setMotivation = useOnboardingStore((state) => state.setMotivation);

  const options: Option<Motivation>[] = MOTIVATIONS.map((motivation) => ({
    value: motivation,
    label: t(`motivation.options.${motivation}.label`),
    description: t(`motivation.options.${motivation}.description`),
  }));

  return (
    <OnboardingStepScreen
      step="motivation"
      title={t('motivation.title')}
      subtitle={t('motivation.subtitle')}
      canContinue={selected !== undefined}
      onContinue={() => router.push('/goal')}
    >
      <OptionList
        testIDPrefix="motivation"
        options={options}
        selected={selected}
        onSelect={setMotivation}
      />
    </OnboardingStepScreen>
  );
}

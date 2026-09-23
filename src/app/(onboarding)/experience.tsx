import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OnboardingStepScreen } from '@/features/onboarding/components/OnboardingStepScreen';
import { OptionList, type Option } from '@/features/onboarding/components/OptionList';
import { useOnboardingStore } from '@/features/onboarding/store';
import { EXPERIENCE_LEVELS, type ExperienceLevel } from '@/services';
import { optionKey } from '@/features/onboarding/logic/optionKeys';

export default function ExperienceStep() {
  const { t } = useTranslation('onboarding');
  const router = useRouter();

  const selected = useOnboardingStore((state) => state.draft.experienceLevel);
  const setExperienceLevel = useOnboardingStore((state) => state.setExperienceLevel);

  const options: Option<ExperienceLevel>[] = EXPERIENCE_LEVELS.map((level) => ({
    value: level,
    label: t(`${optionKey('experience', level)}.label`),
    description: t(`${optionKey('experience', level)}.description`),
  }));

  return (
    <OnboardingStepScreen
      step="experience"
      title={t('experience.title')}
      subtitle={t('experience.subtitle')}
      canContinue={selected !== undefined}
      onContinue={() => router.push('/motivation')}
    >
      <OptionList
        testIDPrefix="experience"
        options={options}
        selected={selected}
        onSelect={setExperienceLevel}
      />
    </OnboardingStepScreen>
  );
}

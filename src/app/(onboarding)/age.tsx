import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TextField } from '@/components/ui';
import { useAppConfig } from '@/features/config/hooks/useAppConfig';
import { OnboardingStepScreen } from '@/features/onboarding/components/OnboardingStepScreen';
import { useRejectUnderageAccount } from '@/features/onboarding/hooks/useOnboarding';
import { classifyAge, validateBirthYear } from '@/features/onboarding/logic/age';
import { useOnboardingStore } from '@/features/onboarding/store';

/**
 * The age gate (SPEC §11, §41, D10). Always first — see `logic/steps.ts`.
 *
 * The input accepts ANY four-digit year, including years that make the user too young. That is
 * deliberate: a picker offering only permitted years would teach a twelve-year-old to pick a
 * different one, and a gate nobody can fail is not a gate.
 *
 * A free-text year rather than a date picker because SPEC §11 collects the year only — a full
 * date of birth is more personal data than an age gate needs.
 */
export default function AgeStep() {
  const { t } = useTranslation('onboarding');
  const router = useRouter();

  const { data: config } = useAppConfig();
  const setBirthYear = useOnboardingStore((state) => state.setBirthYear);
  const rejectUnderage = useRejectUnderageAccount({
    showRefusal: () => router.replace('/blocked'),
  });

  const [value, setValue] = useState('');
  const [attempted, setAttempted] = useState(false);

  const problem = validateBirthYear(value);
  const fieldError = attempted && problem ? t(`age.errors.${problem}`) : null;

  const submit = () => {
    setAttempted(true);
    if (problem) return;

    const birthYear = Number.parseInt(value.trim(), 10);
    const verdict = classifyAge(birthYear, {
      minUserAge: config.min_user_age,
      minorProtectionAge: config.minor_protection_age,
    });

    if (verdict === 'too-young') {
      // Acted on immediately rather than at the end of the flow: the account must not exist,
      // and the remaining questions would be a waste of this person's time.
      rejectUnderage.mutate();
      return;
    }

    setBirthYear(birthYear);
    router.push('/experience');
  };

  return (
    <OnboardingStepScreen
      step="age"
      title={t('age.title')}
      subtitle={t('age.subtitle')}
      onContinue={submit}
      busy={rejectUnderage.isPending}
    >
      <TextField
        testID="onboarding-birth-year"
        label={t('age.label')}
        placeholder={t('age.placeholder')}
        value={value}
        onChangeText={setValue}
        error={fieldError ?? undefined}
        hint={t('age.hint')}
        keyboardType="number-pad"
        returnKeyType="next"
        onSubmitEditing={submit}
        editable={!rejectUnderage.isPending}
      />
    </OnboardingStepScreen>
  );
}

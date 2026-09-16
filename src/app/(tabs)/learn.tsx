import { useTranslation } from 'react-i18next';

import { PlaceholderState, Screen } from '@/components/ui';

export default function LearnScreen() {
  const { t } = useTranslation('learn');

  return (
    <Screen>
      <PlaceholderState title={t('placeholder.title')} body={t('placeholder.body')} />
    </Screen>
  );
}

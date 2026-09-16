import { useTranslation } from 'react-i18next';

import { PlaceholderState, Screen } from '@/components/ui';

export default function HomeScreen() {
  const { t } = useTranslation('home');

  return (
    <Screen>
      <PlaceholderState title={t('placeholder.title')} body={t('placeholder.body')} />
    </Screen>
  );
}

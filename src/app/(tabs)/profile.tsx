import { useTranslation } from 'react-i18next';

import { PlaceholderState, Screen } from '@/components/ui';

export default function ProfileScreen() {
  const { t } = useTranslation('profile');

  return (
    <Screen>
      <PlaceholderState title={t('placeholder.title')} body={t('placeholder.body')} />
    </Screen>
  );
}

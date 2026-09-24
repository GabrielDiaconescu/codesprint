import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { BottomSheet, Button, Card, Text } from '@/components/ui';
import { useSessionStore } from '@/store/sessionStore';
import { useTheme } from '@/theme';

import { useDeleteAccount, useExportMyData } from '../hooks/useYourData';

/**
 * The learner's two data rights, in the app (SPEC §29, §41): a copy of everything, and
 * deletion of everything.
 *
 * Deletion is confirmed in a sheet that says plainly what goes and that it cannot be undone —
 * and that a store subscription is NOT cancelled by it, because only the learner can cancel
 * that, and a deleted account that keeps being billed is the worst outcome on this screen.
 */
export const YourDataCard = () => {
  const { t } = useTranslation('settings');
  const { t: common } = useTranslation('common');
  const theme = useTheme();
  const isGuest = useSessionStore((state) => state.status === 'guest');
  const [confirming, setConfirming] = useState(false);

  const exportData = useExportMyData();
  const deletion = useDeleteAccount();

  return (
    <>
      <Card testID="your-data">
        <View style={{ gap: theme.spacing.md }}>
          <View style={{ gap: theme.spacing.xs }}>
            <Text variant="bodyStrong">{t('yourData.title')}</Text>
            <Text variant="caption" tone="secondary">
              {t('yourData.body')}
            </Text>
          </View>

          <Button
            testID="your-data-export"
            variant="secondary"
            icon="download"
            label={t('yourData.export')}
            loading={exportData.isPending}
            onPress={() => exportData.mutate()}
            fullWidth
          />

          <Button
            testID="your-data-delete"
            variant="ghost"
            icon="trash"
            label={t('yourData.delete')}
            onPress={() => setConfirming(true)}
          />
        </View>
      </Card>

      <BottomSheet
        testID="delete-account-sheet"
        visible={confirming}
        onClose={() => setConfirming(false)}
        title={t('yourData.confirmTitle')}
        closeLabel={common('actions.close')}
      >
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="body">
            {t(isGuest ? 'yourData.confirmBodyGuest' : 'yourData.confirmBody')}
          </Text>
          <Text variant="bodySmall" tone="secondary">
            {t('yourData.subscriptionNote')}
          </Text>

          {deletion.isError && (
            <Text
              testID="delete-account-error"
              variant="bodySmall"
              tone="danger"
              accessibilityRole="alert"
            >
              {t('yourData.deleteFailed')}
            </Text>
          )}

          <Button
            testID="delete-account-confirm"
            variant="danger"
            label={t('yourData.confirm')}
            loading={deletion.isPending}
            onPress={() => deletion.mutate()}
            fullWidth
          />
        </View>
      </BottomSheet>
    </>
  );
};

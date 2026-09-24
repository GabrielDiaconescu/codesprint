import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { services, type AccountDeletionResult } from '@/services';
import { shareTextFile } from '@/services/files/shareFile';
import { useToastStore } from '@/store/toastStore';

import { exportFileName } from '../logic/legalUrls';

/**
 * "Export my data" (SPEC §41 — access and portability): everything the server holds about the
 * learner, as a JSON file handed to the system share sheet — Files, Drive, email.
 *
 * Any failure gets one plain message. The likely ones are no connection and the hourly export
 * limit, and the advice is the same for both: try again in a little while.
 */
export const useExportMyData = () => {
  const { t } = useTranslation('settings');
  const showToast = useToastStore((state) => state.show);

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const data = await services.profile.exportMyData();
      await shareTextFile({
        fileName: exportFileName(new Date()),
        content: JSON.stringify(data, null, 2),
        mimeType: 'application/json',
        dialogTitle: t('yourData.shareTitle'),
      });
    },
    onError: () => showToast({ message: t('yourData.exportFailed'), tone: 'error' }),
  });
};

/**
 * "Delete account" (SPEC §41). On success the session is already gone (the service signs out
 * locally), so the router's guards take the learner to the sign-in screen; every cached query
 * belonged to the deleted user and goes with it.
 */
export const useDeleteAccount = () => {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.show);

  return useMutation<AccountDeletionResult, Error, void>({
    mutationFn: () => services.auth.deleteAccount(),
    onSuccess: () => {
      queryClient.clear();
      showToast({ message: t('yourData.deleted'), tone: 'success' });
    },
  });
};

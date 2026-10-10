import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { BottomSheet, Button, Text, TextField } from '@/components/ui';
import { useToastStore } from '@/store/toastStore';
import { useTheme } from '@/theme';

import { useChangePassword } from '../hooks/useAuthActions';
import { useAuthErrorText } from '../hooks/useAuthForm';
import { validatePassword } from '../logic/validation';
import { AuthErrorBanner } from './AuthScreen';

interface ChangePasswordSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Changing the password from inside the app (SPEC §29): no email and no website, only the
 * current password and the new one. The new one follows the sign-up rules, which mirror the
 * server's. On success every other device is signed out — said in the sheet before it happens.
 */
export const ChangePasswordSheet = ({ visible, onClose }: ChangePasswordSheetProps) => {
  const { t } = useTranslation('auth');
  const { t: common } = useTranslation('common');
  const theme = useTheme();
  const showToast = useToastStore((state) => state.show);
  const errorText = useAuthErrorText();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [attempted, setAttempted] = useState(false);

  const clear = () => {
    setCurrent('');
    setNext('');
    setAttempted(false);
  };

  const change = useChangePassword({
    // On the mutation, not on mutate(): it must run even if the sheet has gone by then.
    onSuccess: () => {
      clear();
      onClose();
      showToast({ message: t('changePassword.done'), tone: 'success' });
    },
  });

  const close = () => {
    clear();
    change.reset();
    onClose();
  };

  const nextProblem = validatePassword(next);
  const currentError = attempted && current.length === 0 ? t('validation.password.required') : null;
  const nextError = attempted && nextProblem ? t(`validation.password.${nextProblem}`) : null;

  const submit = () => {
    setAttempted(true);
    if (current.length > 0 && !nextProblem) {
      change.mutate({ currentPassword: current, newPassword: next });
    }
  };

  return (
    <BottomSheet
      testID="change-password-sheet"
      visible={visible}
      onClose={close}
      title={t('changePassword.title')}
      closeLabel={common('actions.close')}
    >
      <View style={{ gap: theme.spacing.md }}>
        <Text variant="bodySmall" tone="secondary">
          {t('changePassword.body')}
        </Text>

        <AuthErrorBanner testID="change-password-error" message={errorText(change.error)} />

        <TextField
          testID="change-password-current"
          label={t('changePassword.current')}
          value={current}
          onChangeText={setCurrent}
          error={currentError ?? undefined}
          secure
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="next"
          editable={!change.isPending}
          showPasswordLabel={t('fields.showPassword')}
          hidePasswordLabel={t('fields.hidePassword')}
        />

        <TextField
          testID="change-password-new"
          label={t('fields.newPassword')}
          placeholder={t('fields.passwordPlaceholder')}
          value={next}
          onChangeText={setNext}
          error={nextError ?? undefined}
          hint={t('fields.passwordRule')}
          secure
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
          editable={!change.isPending}
          showPasswordLabel={t('fields.showPassword')}
          hidePasswordLabel={t('fields.hidePassword')}
        />

        <Button
          testID="change-password-submit"
          label={t('changePassword.submit')}
          onPress={submit}
          loading={change.isPending}
          fullWidth
        />
      </View>
    </BottomSheet>
  );
};

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, TextField } from '@/components/ui';
import { AuthErrorBanner, AuthScreen } from '@/features/auth/components/AuthScreen';
import { useUpdatePassword } from '@/features/auth/hooks/useAuthActions';
import { useAuthErrorText } from '@/features/auth/hooks/useAuthForm';
import { validatePassword } from '@/features/auth/logic/validation';
import { useTheme } from '@/theme';

/**
 * Reached only from a consumed recovery link (SPEC §12).
 *
 * The recovery code has already been exchanged by `auth-callback`, so there IS a session
 * here. `pendingPasswordReset` in the session store is what keeps the router on this screen
 * instead of dropping the user into the app with a password they still do not know.
 */
export default function ResetPasswordScreen() {
  const { t } = useTranslation('auth');
  const theme = useTheme();

  const [password, setPassword] = useState('');
  const [attempted, setAttempted] = useState(false);
  const errorText = useAuthErrorText();

  // Clearing pendingPasswordReset is what releases the router — the hook does it on success.
  const updatePassword = useUpdatePassword();

  const problem = validatePassword(password);
  const fieldError = attempted && problem ? t(`validation.password.${problem}`) : null;

  const submit = () => {
    setAttempted(true);
    if (!problem) updatePassword.mutate({ password });
  };

  return (
    <AuthScreen title={t('resetPassword.title')} subtitle={t('resetPassword.subtitle')}>
      <AuthErrorBanner message={errorText(updatePassword.error)} />

      <View style={{ gap: theme.spacing.lg }}>
        <TextField
          testID="reset-password"
          label={t('fields.newPassword')}
          placeholder={t('fields.passwordPlaceholder')}
          value={password}
          onChangeText={setPassword}
          error={fieldError ?? undefined}
          hint={t('fields.passwordRule')}
          secure
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
          editable={!updatePassword.isPending}
          showPasswordLabel={t('fields.showPassword')}
          hidePasswordLabel={t('fields.hidePassword')}
        />

        <Button
          testID="reset-submit"
          label={t('resetPassword.submit')}
          onPress={submit}
          loading={updatePassword.isPending}
          fullWidth
        />
      </View>
    </AuthScreen>
  );
}

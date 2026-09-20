import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, StateView, TextField } from '@/components/ui';
import { AuthErrorBanner, AuthScreen } from '@/features/auth/components/AuthScreen';
import { useSendPasswordReset } from '@/features/auth/hooks/useAuthActions';
import { useAuthErrorText, useCredentialsForm } from '@/features/auth/hooks/useAuthForm';
import { normalizeEmail } from '@/features/auth/logic/validation';
import { useTheme } from '@/theme';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation('auth');
  const theme = useTheme();
  const router = useRouter();

  // No password on this screen, so only the address is validated.
  const form = useCredentialsForm({ requirePassword: false });
  const errorText = useAuthErrorText();
  const [sentTo, setSentTo] = useState<string | null>(null);

  const sendReset = useSendPasswordReset({
    onSuccess: (_result, { email }) => setSentTo(normalizeEmail(email)),
  });

  if (sentTo) {
    return (
      <AuthScreen title={t('forgotPassword.sentTitle')}>
        <StateView
          icon="mail"
          title={t('forgotPassword.sentTitle')}
          body={t('forgotPassword.sentBody', { email: sentTo })}
          actionLabel={t('forgotPassword.back')}
          onAction={() => router.back()}
        />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title={t('forgotPassword.title')} subtitle={t('forgotPassword.subtitle')}>
      <AuthErrorBanner message={errorText(sendReset.error)} />

      <View style={{ gap: theme.spacing.lg }}>
        <TextField
          testID="forgot-email"
          label={t('fields.email')}
          placeholder={t('fields.emailPlaceholder')}
          value={form.email}
          onChangeText={form.setEmail}
          error={form.emailError ?? undefined}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="go"
          onSubmitEditing={() => form.submit(sendReset.mutate)}
          editable={!sendReset.isPending}
        />

        <Button
          testID="forgot-submit"
          label={t('forgotPassword.submit')}
          onPress={() => form.submit(sendReset.mutate)}
          loading={sendReset.isPending}
          fullWidth
        />

        <Button
          variant="ghost"
          label={t('forgotPassword.back')}
          onPress={() => router.back()}
          disabled={sendReset.isPending}
        />
      </View>
    </AuthScreen>
  );
}

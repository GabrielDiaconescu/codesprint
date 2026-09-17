import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Text, TextField } from '@/components/ui';
import { AuthErrorBanner, AuthScreen } from '@/features/auth/components/AuthScreen';
import { useSignUp } from '@/features/auth/hooks/useAuthActions';
import { useAuthErrorText, useCredentialsForm } from '@/features/auth/hooks/useAuthForm';
import { normalizeEmail } from '@/features/auth/logic/validation';
import { useTheme } from '@/theme';

export default function SignUpScreen() {
  const { t } = useTranslation('auth');
  const theme = useTheme();
  const router = useRouter();

  const form = useCredentialsForm();
  const errorText = useAuthErrorText();

  const signUp = useSignUp({
    onSuccess: (result, { email }) => {
      // `replace`, not `push`: going "back" to a filled-in signup form after the account
      // exists invites a second attempt that then fails as a duplicate.
      if (result.needsConfirmation) {
        router.replace({ pathname: '/verify-email', params: { email: normalizeEmail(email) } });
      }
      // Otherwise a session already exists and the router's guard moves us to the app.
    },
  });

  return (
    <AuthScreen title={t('signUp.title')} subtitle={t('signUp.subtitle')}>
      <AuthErrorBanner message={errorText(signUp.error)} />

      <View style={{ gap: theme.spacing.lg }}>
        <TextField
          testID="sign-up-email"
          label={t('fields.email')}
          placeholder={t('fields.emailPlaceholder')}
          value={form.email}
          onChangeText={form.setEmail}
          error={form.emailError ?? undefined}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          editable={!signUp.isPending}
        />

        <TextField
          testID="sign-up-password"
          label={t('fields.password')}
          placeholder={t('fields.passwordPlaceholder')}
          value={form.password}
          onChangeText={form.setPassword}
          error={form.passwordError ?? undefined}
          hint={t('fields.passwordRule')}
          secure
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={() => form.submit(signUp.mutate)}
          editable={!signUp.isPending}
          showPasswordLabel={t('fields.showPassword')}
          hidePasswordLabel={t('fields.hidePassword')}
        />

        <Button
          testID="sign-up-submit"
          label={t('signUp.submit')}
          onPress={() => form.submit(signUp.mutate)}
          loading={signUp.isPending}
          fullWidth
        />
      </View>

      <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
        <Text variant="bodySmall" tone="secondary">
          {t('signUp.haveAccount')}
        </Text>
        <Button
          variant="ghost"
          label={t('signUp.signIn')}
          onPress={() => router.back()}
          disabled={signUp.isPending}
        />
      </View>
    </AuthScreen>
  );
}

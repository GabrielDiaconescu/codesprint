import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Divider, Text, TextField } from '@/components/ui';
import { AuthErrorBanner, AuthScreen } from '@/features/auth/components/AuthScreen';
import { useContinueAsGuest, useSignIn } from '@/features/auth/hooks/useAuthActions';
import { useAuthErrorText, useCredentialsForm } from '@/features/auth/hooks/useAuthForm';
import { normalizeEmail } from '@/features/auth/logic/validation';
import { AuthFailure } from '@/services';
import { useTheme } from '@/theme';

export default function SignInScreen() {
  const { t } = useTranslation('auth');
  const theme = useTheme();
  const router = useRouter();

  const form = useCredentialsForm();
  const errorText = useAuthErrorText();

  const signIn = useSignIn({
    onError: (error, { email }) => {
      // An unconfirmed address is not a failed sign-in, it is an unfinished sign-up. Sending
      // the user to the screen that can resend the link is more useful than an error message
      // telling them to go and find it.
      if (error instanceof AuthFailure && error.code === 'email-not-confirmed') {
        router.push({ pathname: '/verify-email', params: { email: normalizeEmail(email) } });
      }
    },
  });
  const guest = useContinueAsGuest();

  // Success needs no navigation: the session change flips the router's guard (see app/_layout).
  const busy = signIn.isPending || guest.isPending;

  return (
    <AuthScreen title={t('signIn.title')} subtitle={t('signIn.subtitle')}>
      <AuthErrorBanner message={errorText(signIn.error ?? guest.error)} />

      <View style={{ gap: theme.spacing.lg }}>
        <TextField
          testID="sign-in-email"
          label={t('fields.email')}
          placeholder={t('fields.emailPlaceholder')}
          value={form.email}
          onChangeText={form.setEmail}
          error={form.emailError ?? undefined}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          editable={!busy}
        />

        <TextField
          testID="sign-in-password"
          label={t('fields.password')}
          value={form.password}
          onChangeText={form.setPassword}
          error={form.passwordError ?? undefined}
          secure
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => form.submit(signIn.mutate)}
          editable={!busy}
          showPasswordLabel={t('fields.showPassword')}
          hidePasswordLabel={t('fields.hidePassword')}
        />

        <Button
          testID="sign-in-submit"
          label={t('signIn.submit')}
          onPress={() => form.submit(signIn.mutate)}
          loading={signIn.isPending}
          disabled={busy}
          fullWidth
        />

        <Button
          variant="ghost"
          label={t('signIn.forgot')}
          onPress={() => router.push('/forgot-password')}
          disabled={busy}
        />
      </View>

      <Divider />

      <View style={{ gap: theme.spacing.sm }}>
        <Button
          testID="sign-in-guest"
          variant="secondary"
          label={t('signIn.guest')}
          icon="flash-outline"
          onPress={() => guest.mutate()}
          loading={guest.isPending}
          disabled={busy}
          fullWidth
        />
        <Text variant="caption" tone="secondary">
          {t('signIn.guestHint')}
        </Text>
      </View>

      <View style={[{ gap: theme.spacing.xs }, { alignItems: 'center' }]}>
        <Text variant="bodySmall" tone="secondary">
          {t('signIn.noAccount')}
        </Text>
        <Button
          variant="ghost"
          label={t('signIn.createAccount')}
          onPress={() => router.push('/sign-up')}
          disabled={busy}
        />
      </View>
    </AuthScreen>
  );
}

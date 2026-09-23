import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Icon, Text } from '@/components/ui';
import { AuthErrorBanner, AuthScreen } from '@/features/auth/components/AuthScreen';
import { useResendConfirmation } from '@/features/auth/hooks/useAuthActions';
import { useAuthErrorText } from '@/features/auth/hooks/useAuthForm';
import { useSessionStore } from '@/store/sessionStore';
import { useTheme } from '@/theme';

/**
 * "Check your email" (SPEC §12), for both ways an address gets there.
 *
 * Outside the (auth) group on purpose, next to `auth-callback`: a new account arrives here
 * signed OUT, but a guest who has just added an email arrives signed IN, still as a guest until
 * the link is opened. Inside (auth) the guest was refused the route — silently, so after
 * "Create account" nothing seemed to happen although the email had gone out. The E2E
 * guest-to-account flow found it.
 *
 * What the screen offers follows from which of the two it is: a guest goes back to learning
 * (their progress is theirs either way), a new account goes back to try another address.
 */
export default function VerifyEmailScreen() {
  const { t } = useTranslation('auth');
  const theme = useTheme();
  const router = useRouter();
  const isGuest = useSessionStore((state) => state.status === 'guest');

  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';

  const errorText = useAuthErrorText();
  const resend = useResendConfirmation();

  return (
    <AuthScreen title={t('verifyEmail.title')} subtitle={t('verifyEmail.subtitle', { email })}>
      <AuthErrorBanner message={errorText(resend.error)} />

      <View style={{ gap: theme.spacing.md }}>
        {resend.isSuccess && (
          <View style={[styles.confirmation, { gap: theme.spacing.sm }]}>
            <Icon name="checkmark-circle" size="md" color={theme.colors.success} />
            <Text variant="bodySmall" tone="success">
              {t('verifyEmail.resent')}
            </Text>
          </View>
        )}

        <Text variant="caption" tone="secondary">
          {t('verifyEmail.spamHint')}
        </Text>

        <Button
          testID="verify-resend"
          variant="secondary"
          label={t('verifyEmail.resend')}
          onPress={() => resend.mutate({ email, kind: isGuest ? 'email_change' : 'signup' })}
          loading={resend.isPending}
          disabled={email.length === 0}
          fullWidth
        />

        <Button
          testID="verify-back"
          variant="ghost"
          label={t(isGuest ? 'verifyEmail.keepLearning' : 'verifyEmail.back')}
          onPress={() => router.replace(isGuest ? '/' : '/sign-in')}
          disabled={resend.isPending}
        />
      </View>
    </AuthScreen>
  );
}

const styles = {
  confirmation: { flexDirection: 'row', alignItems: 'center' },
} as const;

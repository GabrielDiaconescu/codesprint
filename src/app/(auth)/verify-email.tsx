import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Icon, Text } from '@/components/ui';
import { AuthErrorBanner, AuthScreen } from '@/features/auth/components/AuthScreen';
import { useResendConfirmation } from '@/features/auth/hooks/useAuthActions';
import { useAuthErrorText } from '@/features/auth/hooks/useAuthForm';
import { useTheme } from '@/theme';

export default function VerifyEmailScreen() {
  const { t } = useTranslation('auth');
  const theme = useTheme();
  const router = useRouter();

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
          onPress={() => resend.mutate({ email })}
          loading={resend.isPending}
          disabled={email.length === 0}
          fullWidth
        />

        <Button
          variant="ghost"
          label={t('verifyEmail.back')}
          onPress={() => router.replace('/sign-in')}
          disabled={resend.isPending}
        />
      </View>
    </AuthScreen>
  );
}

const styles = {
  confirmation: { flexDirection: 'row', alignItems: 'center' },
} as const;

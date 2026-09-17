import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Icon, Text, TextField } from '@/components/ui';
import { AuthErrorBanner, AuthScreen } from '@/features/auth/components/AuthScreen';
import { useLinkEmail } from '@/features/auth/hooks/useAuthActions';
import { useAuthErrorText, useCredentialsForm } from '@/features/auth/hooks/useAuthForm';
import { normalizeEmail } from '@/features/auth/logic/validation';
import { useTheme } from '@/theme';

/**
 * Guest -> permanent account (SPEC §12, D1).
 *
 * This is NOT a sign-up. It attaches an email to the session the guest already has, so the
 * user id never changes and every xp_events row, attempt and streak day written as a guest
 * stays theirs. Creating a second account and migrating data would break foreign keys and
 * double-count XP.
 *
 * Lives outside the `(auth)` group because a guest is signed in, and that group is only
 * reachable when signed out.
 */
export default function LinkAccountScreen() {
  const { t } = useTranslation('auth');
  const theme = useTheme();
  const router = useRouter();

  const form = useCredentialsForm();
  const errorText = useAuthErrorText();

  const linkEmail = useLinkEmail({
    onSuccess: (_result, { email }) => {
      router.replace({ pathname: '/verify-email', params: { email: normalizeEmail(email) } });
    },
  });

  return (
    <AuthScreen title={t('linkAccount.title')} subtitle={t('linkAccount.subtitle')}>
      <AuthErrorBanner message={errorText(linkEmail.error)} />

      <View style={[styles.reassurance, { gap: theme.spacing.sm }]}>
        <Icon name="shield-checkmark-outline" size="md" color={theme.colors.success} />
        <Text variant="bodySmall" tone="secondary" style={styles.flex}>
          {t('linkAccount.keepsProgress')}
        </Text>
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <TextField
          testID="link-email"
          label={t('fields.email')}
          placeholder={t('fields.emailPlaceholder')}
          value={form.email}
          onChangeText={form.setEmail}
          error={form.emailError ?? undefined}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          editable={!linkEmail.isPending}
        />

        <TextField
          testID="link-password"
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
          onSubmitEditing={() => form.submit(linkEmail.mutate)}
          editable={!linkEmail.isPending}
          showPasswordLabel={t('fields.showPassword')}
          hidePasswordLabel={t('fields.hidePassword')}
        />

        <Button
          testID="link-submit"
          label={t('linkAccount.submit')}
          onPress={() => form.submit(linkEmail.mutate)}
          loading={linkEmail.isPending}
          fullWidth
        />

        <Button
          variant="ghost"
          label={t('linkAccount.later')}
          onPress={() => router.back()}
          disabled={linkEmail.isPending}
        />
      </View>
    </AuthScreen>
  );
}

const styles = {
  reassurance: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
} as const;

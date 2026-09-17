import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Badge, BottomSheet, Button, Card, Divider, Text } from '@/components/ui';
import { useSignOut } from '@/features/auth/hooks/useAuthActions';
import { useSessionStore } from '@/store/sessionStore';
import { useTheme } from '@/theme';

/**
 * Who you are signed in as, and the two things you can do about it (SPEC §12, §29).
 *
 * The guest case is the interesting one. Signing out of a guest session is destructive in a
 * way no other sign-out is: there is no email to sign back in with, so the account — and
 * every bit of progress in it — is gone. That deserves a confirmation, and the confirmation
 * has to say so plainly rather than asking a generic "are you sure?".
 */
export const SessionCard = () => {
  const { t } = useTranslation('auth');
  const { t: commonT } = useTranslation('common');
  const theme = useTheme();
  const router = useRouter();

  const status = useSessionStore((state) => state.status);
  const email = useSessionStore((state) => state.email);
  const emailConfirmed = useSessionStore((state) => state.emailConfirmed);

  const [confirming, setConfirming] = useState(false);
  const signOut = useSignOut({ onSuccess: () => setConfirming(false) });

  const isGuest = status === 'guest';

  return (
    <>
      <Card>
        <View style={[styles.header, { gap: theme.spacing.sm }]}>
          <Text variant="subheading" style={styles.flex} numberOfLines={1}>
            {isGuest ? t('session.guestBadge') : (email ?? '')}
          </Text>
          {isGuest ? (
            <Badge label={t('session.guestBadge')} tone="neutral" icon="person-outline" />
          ) : emailConfirmed ? null : (
            <Badge label={t('session.unconfirmed')} tone="warning" icon="mail-unread-outline" />
          )}
        </View>

        {isGuest && (
          <>
            <Text variant="bodySmall" tone="secondary" style={{ marginTop: theme.spacing.xs }}>
              {t('linkAccount.subtitle')}
            </Text>
            <View style={{ marginTop: theme.spacing.md }}>
              <Button
                testID="profile-link-account"
                label={t('linkAccount.submit')}
                icon="shield-checkmark-outline"
                onPress={() => router.push('/link-account')}
                fullWidth
              />
            </View>
          </>
        )}

        <Divider />

        <Button
          testID="profile-sign-out"
          variant="ghost"
          label={t('session.signOut')}
          icon="log-out-outline"
          onPress={() => setConfirming(true)}
        />
      </Card>

      <BottomSheet
        visible={confirming}
        onClose={() => setConfirming(false)}
        title={t('session.signOutConfirm')}
        closeLabel={commonT('actions.close')}
      >
        <View style={{ gap: theme.spacing.md }}>
          {isGuest && (
            <Text variant="bodySmall" tone="danger">
              {t('session.guestSignOutWarning')}
            </Text>
          )}
          <Button
            testID="sign-out-confirm"
            variant={isGuest ? 'danger' : 'primary'}
            label={t('session.signOut')}
            onPress={() => signOut.mutate()}
            loading={signOut.isPending}
            fullWidth
          />
        </View>
      </BottomSheet>
    </>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Screen, StateView, Text } from '@/components/ui';
import { services } from '@/services';
import { useSessionStore } from '@/store/sessionStore';
import { useTheme } from '@/theme';

/**
 * Where every auth email lands (SPEC §12).
 *
 * Deliberately OUTSIDE the router's signed-in/signed-out guards in `app/_layout.tsx`: a
 * confirmation link arrives while signed out, a recovery link can arrive in either state, and
 * a screen that only exists in one of them would 404 exactly when it is needed.
 */
export default function AuthCallbackScreen() {
  const { t } = useTranslation('auth');
  const theme = useTheme();
  const router = useRouter();

  const params = useLocalSearchParams();
  const status = useSessionStore((state) => state.status);
  const beginPasswordReset = useSessionStore((state) => state.beginPasswordReset);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // The code is single-use: exchanging it twice fails and would turn a good link into an
  // error. `useLocalSearchParams` returns a fresh object on every render, so a plain
  // dependency array would re-run this effect and do exactly that.
  const consumed = useRef(false);

  useEffect(() => {
    if (consumed.current) return;
    consumed.current = true;

    let active = true;

    const leave = () => {
      if (active) router.replace(status === 'signed-out' ? '/sign-in' : '/');
    };

    services.auth
      .consumeAuthCallback(params)
      .then((outcome) => {
        if (!active) return;

        switch (outcome.kind) {
          case 'recovery':
            // Flag first, navigate second: the flag is what stops the router's guard from
            // treating this brand-new session as a normal sign-in.
            beginPasswordReset();
            router.replace('/reset-password');
            break;
          case 'signed-in':
            router.replace('/');
            break;
          case 'error':
            setErrorMessage(t(`errors.${outcome.code}`));
            break;
          case 'ignored':
            leave();
            break;
        }
      })
      .catch(() => {
        if (active) setErrorMessage(t('errors.unknown'));
      });

    return () => {
      active = false;
    };
  }, [params, router, status, t, beginPasswordReset]);

  if (errorMessage) {
    return (
      <Screen>
        <View style={styles.centre}>
          <StateView
            icon="link-outline"
            tone="danger"
            title={t('callback.failedTitle')}
            body={errorMessage}
            actionLabel={t('callback.backToSignIn')}
            onAction={() => router.replace('/sign-in')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={[styles.centre, { gap: theme.spacing.lg }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="body" tone="secondary">
          {t('callback.working')}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

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
  const beginPasswordReset = useSessionStore((state) => state.beginPasswordReset);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // The code is single-use: exchanging it twice fails and would turn a good link into an
  // error. `useLocalSearchParams` returns a fresh object on every render, so a plain
  // dependency array would re-run this effect and do exactly that.
  const consumed = useRef(false);

  // Whether there is still a screen to act on — the ONLY thing that may stop the outcome from
  // being acted on. It used to be the effect's own cleanup, with the session status among the
  // effect's dependencies: but exchanging the code IS what changes the status (a guest becomes
  // a registered user), so the exchange cancelled its own result and the screen stayed on
  // "Signing you in…" for good. The E2E guest-to-account flow caught it.
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  useEffect(() => {
    if (consumed.current) return;
    consumed.current = true;

    services.auth
      .consumeAuthCallback(params)
      .then((outcome) => {
        if (!mounted.current) return;

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
            // Read now, not captured when the effect started: the session may have changed.
            router.replace(useSessionStore.getState().status === 'signed-out' ? '/sign-in' : '/');
            break;
        }
      })
      .catch(() => {
        if (mounted.current) setErrorMessage(t('errors.unknown'));
      });
  }, [params, router, t, beginPasswordReset]);

  if (errorMessage) {
    return (
      <Screen>
        <View style={styles.centre}>
          <StateView
            icon="link"
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

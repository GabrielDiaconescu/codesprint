import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Screen, StateView, ToastHost } from '@/components/ui';
import { useAuthBootstrap } from '@/features/auth/hooks/useAuthBootstrap';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { useSessionHeartbeat } from '@/features/profile/hooks/useSessionHeartbeat';
import i18n, { initI18n } from '@/i18n';
import { getEnv } from '@/lib/env';
import { createQueryClient } from '@/lib/queryClient';
import { assertNoNoopServicesInProduction, services } from '@/services';
import { useSessionStore } from '@/store/sessionStore';
import { ThemeProvider, useAppFonts, useTheme } from '@/theme';

initI18n();

// Validate the environment at module load: a misconfigured build fails immediately and
// visibly rather than somewhere deep in a feature (SPEC §46, §56).
const env = getEnv();
assertNoNoopServicesInProduction(env.EXPO_PUBLIC_APP_ENV);

// Hold the splash screen until fonts and the session are ready, so the first frame is neither
// in the system font nor the wrong screen.
void SplashScreen.preventAutoHideAsync();

const FullScreenSpinner = () => {
  const theme = useTheme();
  return (
    <Screen>
      <View style={styles.centre}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    </Screen>
  );
};

const ThemedApp = () => {
  const theme = useTheme();
  const { t } = useTranslation('common');

  const status = useSessionStore((state) => state.status);
  const pendingPasswordReset = useSessionStore((state) => state.pendingPasswordReset);

  const isSignedIn = status === 'guest' || status === 'authenticated';

  // A recovery link produces a real session, so "signed in" is not enough to let someone into
  // the app: until the new password is set they are held on the reset screen. Without this
  // they would land on Home holding a password they do not know (SPEC §12).
  const canUseApp = isSignedIn && !pendingPasswordReset;

  const profileQuery = useProfile();
  useSessionHeartbeat();

  const onboardingCompleted = profileQuery.data?.onboardingCompleted ?? false;
  const profileReady = profileQuery.isSuccess;

  // The profile decides between onboarding and the app, so it has to resolve before either can
  // be shown. This is the only place in the app that blocks on a query, and it does so for one
  // request on cold start.
  if (canUseApp && profileQuery.isPending) return <FullScreenSpinner />;

  if (canUseApp && profileQuery.isError) {
    return (
      <Screen>
        <View style={styles.centre}>
          <StateView
            icon="cloud-offline-outline"
            tone="danger"
            title={t('states.errorTitle')}
            body={t('states.errorBody')}
            actionLabel={t('actions.retry')}
            onAction={() => void profileQuery.refetch()}
          />
        </View>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.textPrimary,
          headerTitleStyle: { fontFamily: theme.fontFamily.semibold },
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Protected guard={canUseApp && profileReady && onboardingCompleted}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="link-account"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          {/* Full-screen and outside the tabs: no tab bar and no banner ad while reading
              or answering (SPEC §10, §30). */}
          <Stack.Screen name="progress" options={{ title: '' }} />
          <Stack.Screen name="practice" options={{ title: '' }} />
          <Stack.Screen name="challenge" options={{ title: '' }} />
          <Stack.Screen name="module/[id]" options={{ title: '' }} />
          <Stack.Screen name="lesson/[id]" options={{ title: '' }} />
          <Stack.Screen
            name="gallery"
            options={{ title: 'Component gallery', presentation: 'modal' }}
          />
        </Stack.Protected>

        <Stack.Protected guard={canUseApp && profileReady && !onboardingCompleted}>
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={!canUseApp}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>

        {/* Outside every guard on purpose. An auth email can arrive in either state, and the
            age-gate refusal screen has to survive the sign-out that precedes it. */}
        <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
        <Stack.Screen name="blocked" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack>
      <ToastHost dismissLabel={t('actions.close')} />
    </View>
  );
};

export default function RootLayout() {
  const queryClient = useMemo(() => createQueryClient(), []);
  const [fontsLoaded, fontError] = useAppFonts();

  useAuthBootstrap();
  const sessionResolved = useSessionStore((state) => state.status !== 'loading');

  useEffect(() => {
    void services.monitoring.initialize();
    void services.config.initialize();
  }, []);

  useEffect(() => {
    // A font failure must not leave the user on a permanent splash screen: report it and
    // carry on with the system font rather than blocking the app (SPEC §46).
    if (fontError) {
      services.monitoring.captureException(fontError, { stage: 'font-loading' });
    }
  }, [fontError]);

  const ready = (fontsLoaded || fontError) && sessionResolved;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // Nothing is rendered until the session is known. Mounting the router first would flash the
  // sign-in screen at every returning user before the stored session resolves. The initial
  // deep link is unaffected: the router reads it when it mounts, not before.
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18n}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <ThemedApp />
            </ThemeProvider>
          </QueryClientProvider>
        </I18nextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

/**
 * Route-level error boundary (SPEC §46): the user never lands on a blank screen.
 * Expo Router renders this when a route in this segment throws.
 */
export { ErrorBoundary } from '@/components/ErrorBoundary';

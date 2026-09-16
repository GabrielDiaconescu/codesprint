import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components/ui';
import i18n, { initI18n } from '@/i18n';
import { getEnv } from '@/lib/env';
import { createQueryClient } from '@/lib/queryClient';
import { assertNoNoopServicesInProduction, services } from '@/services';
import { ThemeProvider, useAppFonts, useTheme } from '@/theme';

initI18n();

// Validate the environment at module load: a misconfigured build fails immediately and
// visibly rather than somewhere deep in a feature (SPEC §46, §56).
const env = getEnv();
assertNoNoopServicesInProduction(env.EXPO_PUBLIC_APP_ENV);

// Hold the splash screen until fonts are ready, so the first frame is not in the system font.
void SplashScreen.preventAutoHideAsync();

const ThemedApp = () => {
  const theme = useTheme();
  const { t } = useTranslation('common');

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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="gallery"
          options={{ title: 'Component gallery', presentation: 'modal' }}
        />
      </Stack>
      <ToastHost dismissLabel={t('actions.close')} />
    </View>
  );
};

export default function RootLayout() {
  const queryClient = useMemo(() => createQueryClient(), []);
  const [fontsLoaded, fontError] = useAppFonts();

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

  const onLayout = useCallback(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayout}>
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

/**
 * Route-level error boundary (SPEC §46): the user never lands on a blank screen.
 * Expo Router renders this when a route in this segment throws.
 */
export { ErrorBoundary } from '@/components/ErrorBoundary';

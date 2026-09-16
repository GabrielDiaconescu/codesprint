import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { I18nextProvider } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import i18n, { initI18n } from '@/i18n';
import { getEnv } from '@/lib/env';
import { createQueryClient } from '@/lib/queryClient';
import { assertNoNoopServicesInProduction, services } from '@/services';
import { ThemeProvider, useTheme } from '@/theme';

initI18n();

// Validate the environment at module load: a misconfigured build fails immediately and
// visibly rather than somewhere deep in a feature (SPEC §46, §56).
const env = getEnv();
assertNoNoopServicesInProduction(env.EXPO_PUBLIC_APP_ENV);

const ThemedStack = () => {
  const theme = useTheme();

  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.textPrimary,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
};

export default function RootLayout() {
  const queryClient = useMemo(() => createQueryClient(), []);

  useEffect(() => {
    void services.monitoring.initialize();
    void services.config.initialize();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18n}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <ThemedStack />
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

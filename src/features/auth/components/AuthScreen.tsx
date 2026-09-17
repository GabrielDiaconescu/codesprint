import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Icon, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

interface AuthScreenProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * Shared scaffold for the auth screens (SPEC §8, §47).
 *
 * Every one of these screens is a form above the fold with the keyboard open, so the content
 * scrolls and lifts rather than being covered. `keyboardShouldPersistTaps="handled"` matters
 * more than it looks: without it the first tap on "Sign in" only dismisses the keyboard, and
 * the user has to press twice.
 */
export const AuthScreen = ({ title, subtitle, children }: AuthScreenProps) => {
  const theme = useTheme();

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { gap: theme.spacing.lg }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: theme.spacing.xs }}>
            <Text variant="title" accessibilityRole="header">
              {title}
            </Text>
            {subtitle && (
              <Text variant="body" tone="secondary">
                {subtitle}
              </Text>
            )}
          </View>

          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

/**
 * Submission failures, as opposed to per-field validation.
 *
 * Icon plus text, never colour alone (SPEC §47), and it takes the already-translated string —
 * mapping an error code to a sentence is the caller's job via `useAuthErrorText`.
 */
export const AuthErrorBanner = ({ message }: { message: string | null }) => {
  const theme = useTheme();
  if (!message) return null;

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.banner,
        {
          backgroundColor: theme.colors.dangerSurface,
          borderRadius: theme.radius.md,
          padding: theme.spacing.md,
          gap: theme.spacing.sm,
        },
      ]}
    >
      <Icon name="alert-circle" size="md" color={theme.colors.danger} />
      <Text variant="bodySmall" tone="danger" style={styles.flex}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingVertical: 24 },
  banner: { flexDirection: 'row', alignItems: 'flex-start' },
});

import { Stack } from 'expo-router';

/**
 * Auth routes (SPEC §12).
 *
 * Headerless: each screen carries its own title and its own way back, so there is never a
 * system back button pointing at a screen the user cannot return to (a half-created account,
 * or a consumed recovery link).
 */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}

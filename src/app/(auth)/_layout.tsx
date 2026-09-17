import { Stack } from 'expo-router';

/**
 * The route this group opens on.
 *
 * Sign-in, because a returning user is the common case. Without this the group falls back to
 * whichever route sorts first — an alphabetical accident rather than a decision.
 */
export const unstable_settings = { initialRouteName: 'sign-in' };

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

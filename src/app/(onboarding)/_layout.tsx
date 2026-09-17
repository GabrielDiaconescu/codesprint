import { Stack } from 'expo-router';

/**
 * The route this group opens on.
 *
 * The age gate, always: its outcome can end the flow entirely, so nothing may be asked before
 * it. Without this the group falls back to whichever route sorts first — an alphabetical
 * accident rather than a decision.
 */
export const unstable_settings = { initialRouteName: 'age' };

/**
 * Onboarding (SPEC §11).
 *
 * Headerless and gesture-free: the steps carry their own progress indicator, and a swipe-back
 * out of the age gate would let someone slip past it.
 */
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />;
}

import * as Haptics from 'expo-haptics';

import { useSettingsStore } from '@/store/settingsStore';

/**
 * Haptic feedback for answers (SPEC §18, §29).
 *
 * Every call goes through the user's "vibration" setting, and every call swallows failures:
 * a device without a haptic engine, or a simulator, must never turn a correct answer into a
 * red screen. Feedback is a garnish, not a load-bearing part of the flow.
 */
const enabled = () => useSettingsStore.getState().hapticsEnabled;

const attempt = (action: () => Promise<void>) => {
  if (!enabled()) return;
  void action().catch(() => {});
};

export const haptics = {
  correct: () => attempt(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  incorrect: () => attempt(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  /** A light tick for selecting an option or placing a token. */
  select: () => attempt(() => Haptics.selectionAsync()),
};

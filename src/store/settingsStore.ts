import { create } from 'zustand';

import type { ColorScheme } from '@/theme/colors';

export type ThemePreference = ColorScheme | 'system';

/**
 * Client-side settings (SPEC §0.1.3, §29).
 *
 * Phase 1 keeps these in memory only. Persistence to SecureStore/AsyncStorage and
 * server sync arrive with the profile work in Phase 4/5 — persisting now would create
 * a second source of truth that Phase 4 would have to unpick.
 */
interface SettingsState {
  themePreference: ThemePreference;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  setThemePreference: (preference: ThemePreference) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  themePreference: 'system',
  soundEnabled: true,
  hapticsEnabled: true,
  setThemePreference: (themePreference) => set({ themePreference }),
  setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
  setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
}));

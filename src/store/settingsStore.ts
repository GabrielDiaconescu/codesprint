import { create } from 'zustand';

import { loadStoredSettings, saveStoredSettings } from '@/services/settings/settingsStorage';
import type { ColorScheme } from '@/theme/colors';

export type ThemePreference = ColorScheme | 'system';

/**
 * Device settings (SPEC §0.1.3, §29).
 *
 * Client state, so Zustand. These belong to the PHONE, not the account: which theme this
 * device shows and whether it buzzes. Syncing them to `profiles` would make a tablet in dark
 * mode and a phone in light mode into a conflict, which is not what a preference is.
 *
 * They persist through `settingsStorage`. Until Phase 20 they did not, and a theme that reset
 * itself on every launch is a setting the user stops trusting.
 */
interface SettingsState {
  themePreference: ThemePreference;
  hapticsEnabled: boolean;
  /**
   * False until what was stored has been read.
   *
   * The app holds the splash screen for it: applying the stored theme one frame after the
   * first render is a visible flash of the wrong colours.
   */
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setThemePreference: (preference: ThemePreference) => void;
  setHapticsEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const persist = () => {
    const { themePreference, hapticsEnabled } = get();
    void saveStoredSettings({ themePreference, hapticsEnabled });
  };

  return {
    themePreference: 'system',
    hapticsEnabled: true,
    hydrated: false,

    hydrate: async () => {
      const stored = await loadStoredSettings();
      // Spread rather than assign: a stored blob from an older version may be missing a
      // field, and the default has to survive that.
      set({ ...(stored ?? {}), hydrated: true });
    },

    setThemePreference: (themePreference) => {
      set({ themePreference });
      persist();
    },

    setHapticsEnabled: (hapticsEnabled) => {
      set({ hapticsEnabled });
      persist();
    },
  };
});

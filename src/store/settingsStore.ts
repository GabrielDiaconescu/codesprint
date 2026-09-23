import { create } from 'zustand';

import { applyLanguagePreference, parseLanguagePreference, type LanguagePreference } from '@/i18n';
import { loadStoredSettings, saveStoredSettings } from '@/services/settings/settingsStorage';
import type { ColorScheme } from '@/theme/colors';

export type ThemePreference = ColorScheme | 'system';

/**
 * Device settings (SPEC §0.1.3, §29).
 *
 * Client state, so Zustand. These belong to the PHONE, not the account: which theme this
 * device shows, whether it buzzes, and which language it speaks. Syncing them to `profiles`
 * would make a tablet in dark mode and a phone in light mode into a conflict, which is not what
 * a preference is.
 *
 * They persist through `settingsStorage`. Until Phase 20 they did not, and a theme that reset
 * itself on every launch is a setting the user stops trusting.
 */
interface SettingsState {
  themePreference: ThemePreference;
  hapticsEnabled: boolean;
  /** `system` follows the phone's language; anything else is an explicit choice. */
  languagePreference: LanguagePreference;
  /**
   * False until what was stored has been read.
   *
   * The app holds the splash screen for it: applying the stored theme — or language — one
   * frame after the first render is a visible flash of the wrong screen.
   */
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setThemePreference: (preference: ThemePreference) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setLanguagePreference: (preference: LanguagePreference) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const persist = () => {
    const { themePreference, hapticsEnabled, languagePreference } = get();
    void saveStoredSettings({ themePreference, hapticsEnabled, languagePreference });
  };

  return {
    themePreference: 'system',
    hapticsEnabled: true,
    languagePreference: 'system',
    hydrated: false,

    hydrate: async () => {
      const stored = await loadStoredSettings();
      // A stored locale this build no longer ships falls back to the phone's language,
      // rather than to a language the app cannot show.
      const languagePreference = parseLanguagePreference(stored?.languagePreference);

      // Applied before `hydrated` flips, so the first frame after the splash is already in the
      // right language.
      applyLanguagePreference(languagePreference);

      // Spread rather than assign: a stored blob from an older version may be missing a
      // field, and the default has to survive that.
      set({ ...(stored ?? {}), languagePreference, hydrated: true });
    },

    setThemePreference: (themePreference) => {
      set({ themePreference });
      persist();
    },

    setHapticsEnabled: (hapticsEnabled) => {
      set({ hapticsEnabled });
      persist();
    },

    setLanguagePreference: (languagePreference) => {
      // The interface switches at once; storage is slow and can fail, and the screen must not
      // wait for it.
      applyLanguagePreference(languagePreference);
      set({ languagePreference });
      persist();
    },
  };
});

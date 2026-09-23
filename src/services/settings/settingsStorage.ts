import { z } from 'zod';

// The same chunked SecureStore adapter the auth session uses. It lives under `supabase/`
// because that is where it was first needed, but there is nothing Supabase-specific in it,
// and a second storage mechanism for two preferences would be a second thing to get wrong.
import { secureStorageAdapter } from '../supabase/storage';

/**
 * Device preferences that survive a restart (SPEC §29).
 *
 * These are the settings that belong to the PHONE rather than to the account: which theme
 * this device shows, whether it buzzes, and which language it speaks. They are deliberately
 * not on `profiles` — a tablet in dark mode and a phone in light mode is a preference, not a
 * conflict to be synced.
 *
 * Parsed on read rather than trusted. Storage can hold anything a previous version wrote, and
 * a malformed blob must fall back to the defaults rather than put `undefined` into the theme.
 */
const KEY = 'codesprint.settings.v1';

export const storedSettings = z
  .object({
    themePreference: z.enum(['system', 'light', 'dark']),
    hapticsEnabled: z.boolean(),
    // Defaulted, so a blob written before the language setting existed still parses — an
    // update must not reset someone's theme to make room for a new field. Stored as plain
    // text rather than an enum of today's locales: if a locale is ever withdrawn, the store
    // falls back to the phone's language instead of discarding every other setting with it.
    languagePreference: z.string().min(1).default('system'),
  })
  .strict();

export type StoredSettings = z.infer<typeof storedSettings>;
export type StoredSettingsInput = z.input<typeof storedSettings>;

/** Null when nothing has been stored yet, or when what was stored is no longer valid. */
export const loadStoredSettings = async (): Promise<StoredSettings | null> => {
  try {
    const raw = await secureStorageAdapter.getItem(KEY);
    if (raw === null) return null;

    const parsed = storedSettings.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    // A preference that cannot be read is not a reason to fail to start (SPEC §46).
    return null;
  }
};

export const saveStoredSettings = async (settings: StoredSettings): Promise<void> => {
  try {
    await secureStorageAdapter.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Same reasoning: the setting still applies to this session, it just will not survive.
  }
};

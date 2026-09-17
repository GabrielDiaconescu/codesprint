import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Session storage adapter for Supabase Auth (SPEC §12).
 *
 * SecureStore keeps the refresh token in the iOS Keychain / Android Keystore rather than in
 * plaintext AsyncStorage.
 *
 * It has a hard ~2 KB limit per value, and a Supabase session with a large JWT can exceed
 * that. Rather than silently failing to persist — which logs the user out on next launch —
 * the value is split across numbered chunks and reassembled on read.
 */

const CHUNK_SIZE = 1800;
const COUNT_SUFFIX = '__chunks';

const chunkKey = (key: string, index: number) => `${key}__${index}`;

/** SecureStore is unavailable on web; the app is native-only, but tests may import this. */
const isAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

const readCount = async (key: string): Promise<number> => {
  const raw = await SecureStore.getItemAsync(`${key}${COUNT_SUFFIX}`);
  const parsed = raw === null ? 0 : Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const removeChunks = async (key: string, count: number): Promise<void> => {
  await Promise.all(
    Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(chunkKey(key, index))),
  );
  await SecureStore.deleteItemAsync(`${key}${COUNT_SUFFIX}`);
};

export const secureStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (!isAvailable) return null;
    try {
      const count = await readCount(key);
      if (count === 0) return null;

      const parts = await Promise.all(
        Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index))),
      );

      // A missing chunk means the stored value is corrupt; treat it as absent rather than
      // handing Supabase a truncated token it would fail on in a confusing way.
      if (parts.some((part) => part === null)) {
        await removeChunks(key, count);
        return null;
      }
      return parts.join('');
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!isAvailable) return;
    try {
      const previousCount = await readCount(key);

      const chunks: string[] = [];
      for (let offset = 0; offset < value.length; offset += CHUNK_SIZE) {
        chunks.push(value.slice(offset, offset + CHUNK_SIZE));
      }

      await Promise.all(
        chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk)),
      );
      await SecureStore.setItemAsync(`${key}${COUNT_SUFFIX}`, String(chunks.length));

      // Drop chunks left over from a previously longer value.
      for (let index = chunks.length; index < previousCount; index += 1) {
        await SecureStore.deleteItemAsync(chunkKey(key, index));
      }
    } catch {
      // Storage failure must not crash sign-in; the session simply will not persist.
    }
  },

  async removeItem(key: string): Promise<void> {
    if (!isAvailable) return;
    try {
      await removeChunks(key, await readCount(key));
    } catch {
      // Nothing useful to do — the caller is signing out either way.
    }
  },
};

/** Exported for unit tests. */
export const SECURE_STORE_CHUNK_SIZE = CHUNK_SIZE;

import { getSupabaseClient } from '../supabase/client';
import type { AppConfigValues, ConfigService } from '../types';

import { DEFAULT_APP_CONFIG } from './defaults';
import { parseAppConfig } from './schema';

/**
 * Remote config backed by `app_config` (SPEC §50).
 *
 * Fetched once per app start. Bundled defaults cover first launch and every failure mode, so
 * the app is never blocked on the network for its own feature flags — and a Supabase outage
 * degrades to "yesterday's flags" rather than a blank screen.
 */

let cached: AppConfigValues = DEFAULT_APP_CONFIG;

const fetchConfig = async (): Promise<AppConfigValues> => {
  const { data, error } = await getSupabaseClient().rpc('get_app_config');

  if (error) throw error;

  const { values, invalidKeys } = parseAppConfig(data);

  if (invalidKeys.length > 0) {
    // Surfaced rather than swallowed: a key failing validation means the server and the app
    // disagree about a type, which is a bug worth seeing even though the app carries on.
    console.warn('[ConfigService] falling back to defaults for keys:', invalidKeys.join(', '));
  }

  cached = values;
  return values;
};

export const SupabaseConfigService: ConfigService = {
  serviceName: 'SupabaseConfigService',
  isNoop: false,

  async initialize() {
    try {
      return await fetchConfig();
    } catch (error) {
      if (__DEV__) console.warn('[ConfigService] using bundled defaults:', error);
      cached = DEFAULT_APP_CONFIG;
      return cached;
    }
  },

  get<K extends keyof AppConfigValues>(key: K): AppConfigValues[K] {
    return cached[key];
  },

  async refresh() {
    try {
      return await fetchConfig();
    } catch {
      // Keep the last known-good values rather than reverting to bundled defaults: they are
      // fresher, and a transient network failure should not change behaviour.
      return cached;
    }
  },
};

/** Test-only: restores the bundled defaults. */
export const resetConfigCache = (): void => {
  cached = DEFAULT_APP_CONFIG;
};

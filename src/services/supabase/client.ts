import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import { getEnv } from '@/lib/env';
import type { Database } from '@/types/database.types';

import { secureStorageAdapter } from './storage';

/**
 * The Supabase client (SPEC §7).
 *
 * This is the ONLY module in the codebase that imports @supabase/supabase-js — ESLint
 * enforces that, and `src/__tests__/architecture.test.ts` proves it. Features talk to the
 * database through typed RPC helpers, never through a raw client.
 *
 * The key used here is the PUBLISHABLE (anon) key, which is public by design and safe to
 * embed. The secret/service-role key must never appear in the app (SPEC §59.27); it lives
 * only in Edge Function secrets and CI.
 */

let client: SupabaseClient<Database> | undefined;

export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (client) return client;

  const env = getEnv();
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and ' +
        'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env (see .env.example).',
    );
  }

  client = createClient<Database>(url, key, {
    auth: {
      storage: secureStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      // React Native has no URL bar to parse a session out of; deep links are handled
      // explicitly by the auth feature in Phase 4.
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });

  return client;
};

/** Test-only: drops the memoised client so a test can supply a different environment. */
export const resetSupabaseClient = (): void => {
  client = undefined;
};

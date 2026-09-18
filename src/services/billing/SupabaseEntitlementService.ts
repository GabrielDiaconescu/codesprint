import { getSupabaseClient } from '../supabase/client';
import type { EntitlementService } from '../types';

import { serverEntitlements } from './entitlementSchema';

/**
 * What the server says the learner has paid for (SPEC §31).
 *
 * Kept separate from `BillingService` on purpose, and the reason is easy to get wrong: the
 * store SDK is a no-op until RevenueCat credentials exist, but knowing what somebody is
 * entitled to must work *now*. A seeded Premium test account has to look Premium in the UI
 * with no RevenueCat account anywhere in the picture.
 *
 * So: this service is real from the day the table exists, and `BillingService` — purchasing,
 * restoring, offerings — is the part that waits for keys.
 */
export const SupabaseEntitlementService: EntitlementService = {
  serviceName: 'SupabaseEntitlementService',
  isNoop: false,

  async get() {
    const { data, error } = await getSupabaseClient().rpc('get_entitlements');
    if (error) throw error;
    return serverEntitlements.parse(data);
  },

  async refresh() {
    // The immediate path after a purchase or a restore (SPEC §31). The webhook is the
    // reliable one; this is what stops a paying learner staring at a locked module while it
    // arrives. It takes no user id — the Edge Function reads that from the caller's JWT.
    const { data, error } = await getSupabaseClient().functions.invoke('sync-entitlements', {
      body: {},
    });

    if (error) throw error;
    return serverEntitlements.parse((data as { entitlements?: unknown }).entitlements);
  },
};

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { deleteAccount } from '../_shared/account.ts';
import { deleteCustomer, RevenueCatError } from '../_shared/revenuecat.ts';

/**
 * Deletes the calling learner's account, everywhere we keep it (SPEC §41).
 *
 * Like `sync-entitlements`, the user is taken from the caller's JWT and from nothing they send:
 * there is no id to forge, so the only account this can ever delete is the caller's own.
 *
 * Order (see `_shared/account.ts`): the RevenueCat customer first, then the auth user — whose
 * deletion cascades through every table of learner data, with the purchase log redacted by a
 * trigger on the way. A store subscription is NOT cancelled by any of this: only the learner
 * can do that, in the store, and the app tells them so before they confirm.
 */

const json = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') {
    return json(405, { error: 'method not allowed' });
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization) {
    return json(401, { error: 'unauthorized' });
  }

  const url = Deno.env.get('SUPABASE_URL') ?? '';

  // The caller's own token, used only to find out who they are.
  const asCaller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  const { data: auth, error: authError } = await asCaller.auth.getUser();
  if (authError || !auth?.user) {
    return json(401, { error: 'unauthorized' });
  }

  const userId = auth.user.id;
  const apiKey = Deno.env.get('REVENUECAT_SECRET_API_KEY');
  if (!apiKey) {
    console.warn('REVENUECAT_SECRET_API_KEY is not set — the RevenueCat customer is not deleted');
  }

  // Deleting an auth user is an admin operation: the service role, never the user's token.
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false },
  });

  try {
    const result = await deleteAccount({
      deleteBillingCustomer: () => deleteCustomer(apiKey, userId),
      deleteAuthUser: async () => {
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) throw error;
      },
    });

    return json(200, { deleted: true, revenuecat: result.billingCustomer });
  } catch (error) {
    // Nothing has been deleted if RevenueCat failed (it goes first), so "try again" is true.
    const stage = error instanceof RevenueCatError ? 'revenuecat' : 'account';
    console.error('delete-account failed', stage, error);
    return json(502, { error: 'deletion failed', stage });
  }
});

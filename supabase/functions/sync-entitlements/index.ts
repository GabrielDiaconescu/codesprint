import { createClient } from 'jsr:@supabase/supabase-js@2';

import { entitlementsFromSubscriber, fetchSubscriber } from '../_shared/revenuecat.ts';

/**
 * Immediate entitlement sync for the calling user (SPEC §31).
 *
 * The webhook is the reliable path and this is the fast one. A learner who has just paid
 * should not stare at a locked module for however long RevenueCat takes to deliver an event,
 * so the app calls this after a purchase, after a restore, and on app open (throttled).
 *
 * It does exactly what the webhook does — re-fetch the subscriber, reconcile the whole set —
 * but for ONE user, and that user is taken from the caller's JWT rather than from anything
 * they send. There is no user id parameter to get wrong or to forge: the worst a malicious
 * client can do with this endpoint is ask for its own entitlements to be recalculated
 * correctly.
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
  const apiKey = Deno.env.get('REVENUECAT_SECRET_API_KEY');

  if (!apiKey) {
    console.error('REVENUECAT_SECRET_API_KEY is not set — cannot sync entitlements');
    return json(500, { error: 'not configured' });
  }

  // The caller's own token, used only to find out who they are. Nothing is written with it.
  const asCaller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  const { data: auth, error: authError } = await asCaller.auth.getUser();
  if (authError || !auth?.user) {
    return json(401, { error: 'unauthorized' });
  }

  const userId = auth.user.id;

  try {
    const subscriber = await fetchSubscriber(apiKey, userId);

    // The service role, because `apply_entitlements` is granted to it alone — writing paid
    // access is never something a user's own token can do (SPEC §31).
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: { persistSession: false },
    });

    const { data, error } = await admin.rpc('apply_entitlements', {
      p_user_id: userId,
      p_entitlements: entitlementsFromSubscriber(subscriber),
    });

    if (error) throw error;

    return json(200, { entitlements: data });
  } catch (error) {
    // The app treats a failure here as "unchanged" and carries on with what the server last
    // said — never as "no entitlements", which would lock a paying customer out.
    console.error('sync-entitlements failed', userId, error);
    return json(502, { error: 'sync failed' });
  }
});

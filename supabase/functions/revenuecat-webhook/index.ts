// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { entitlementsFromSubscriber, fetchSubscriber } from '../_shared/revenuecat.ts';
import { authorizeWebhook, needsEntitlementSync, parseWebhook } from '../_shared/webhook.ts';

/**
 * RevenueCat webhook (SPEC §31).
 *
 * The thin half of this integration. Everything that decides anything — whether to trust the
 * delivery, who it is about, what the subscriber is entitled to — lives in `_shared`, where it
 * is unit-tested. What is left here is the shape of an HTTP handler and the secrets.
 *
 * Three properties matter, and each is somebody else's job:
 *
 *   * authenticated — `authorizeWebhook`, which fails closed if the secret is unset;
 *   * idempotent — `record_billing_event`, whose primary key makes a replay a no-op;
 *   * order-independent — the subscriber is RE-FETCHED and reconciled whole, so the event is
 *     only ever a signal that something changed, never the change itself.
 *
 * Status codes are chosen for RevenueCat's retry behaviour: 2xx means "delivered, stop", and
 * anything else means "try again". So an event we cannot act on is acknowledged with 200,
 * while an error that a retry might get past returns 5xx.
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

  const auth = authorizeWebhook(
    request.headers.get('Authorization'),
    Deno.env.get('REVENUECAT_WEBHOOK_AUTH'),
  );

  if (auth === 'not-configured') {
    // A misconfiguration, not a bad request. 500 so RevenueCat retries once the secret is set
    // and the deliveries are not silently lost in the meantime.
    console.error('REVENUECAT_WEBHOOK_AUTH is not set — refusing every delivery');
    return json(500, { error: 'webhook not configured' });
  }

  if (auth === 'unauthorized') {
    return json(401, { error: 'unauthorized' });
  }

  const apiKey = Deno.env.get('REVENUECAT_SECRET_API_KEY');
  if (!apiKey) {
    console.error('REVENUECAT_SECRET_API_KEY is not set — cannot re-fetch the subscriber');
    return json(500, { error: 'webhook not configured' });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'invalid json' });
  }

  const parsed = parseWebhook(body);
  if (!parsed) {
    // Nothing actionable, and a retry would produce the same nothing.
    return json(200, { ignored: 'unreadable event' });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  // Logged before any work, so a delivery that fails halfway is still visible in Studio —
  // and so the retry that follows can tell "already seen" from "already done".
  const { data: log, error: logError } = await supabase.rpc('record_billing_event', {
    p_event_id: parsed.eventId,
    p_user_id: parsed.targets.find((target) => target.appUserId)?.appUserId ?? null,
    p_event_type: parsed.eventType,
    p_payload: body,
  });

  if (logError) {
    console.error('could not record billing event', logError);
    return json(500, { error: 'could not record event' });
  }

  if (log?.already_processed) {
    return json(200, { ignored: 'duplicate delivery', event_id: parsed.eventId });
  }

  if (!needsEntitlementSync(parsed.eventType)) {
    await supabase.rpc('mark_billing_event_processed', { p_event_id: parsed.eventId });
    return json(200, { ignored: 'informational event', event_id: parsed.eventId });
  }

  const synced: string[] = [];

  for (const target of parsed.targets) {
    // An id RevenueCat knows but this database does not — an anonymous purchase that never
    // reached a signed-in account. There is nobody to grant anything to.
    if (!target.appUserId) continue;

    try {
      const subscriber = await fetchSubscriber(apiKey, target.lookupId);

      const { error } = await supabase.rpc('apply_entitlements', {
        p_user_id: target.appUserId,
        p_entitlements: entitlementsFromSubscriber(subscriber),
      });

      if (error) throw error;
      synced.push(target.appUserId);
    } catch (error) {
      // Leave `processed_at` null and return 5xx: RevenueCat retries, and the duplicate check
      // above will not swallow it, because the event row exists but was never completed.
      console.error('entitlement sync failed', target.appUserId, error);
      return json(502, { error: 'sync failed', event_id: parsed.eventId });
    }
  }

  await supabase.rpc('mark_billing_event_processed', { p_event_id: parsed.eventId });

  return json(200, { event_id: parsed.eventId, synced });
});

/**
 * Reading a RevenueCat subscriber (SPEC §31).
 *
 * This module is deliberately runtime-agnostic: no `Deno` globals, no remote imports, and
 * `fetch` injected rather than reached for. The Edge Functions are the only Deno-specific
 * code in this directory, and they are thin shells around what is here — which means the
 * logic that decides whether somebody has paid is unit-tested by the ordinary `npm test`
 * suite rather than by a toolchain nobody has installed.
 *
 * Everything here works from the FULL subscriber the REST API returns, never from a webhook
 * payload. SPEC §31 requires that re-fetch, and the reason is worth remembering: webhook
 * deliveries arrive out of order, and applying them as a sequence of deltas eventually
 * produces a subscriber state that never existed.
 */

export const REVENUECAT_API = 'https://api.revenuecat.com/v1';

/** The slice of RevenueCat's subscriber response this product depends on. */
export interface RevenueCatEntitlement {
  expires_date?: string | null;
  product_identifier?: string | null;
  purchase_date?: string | null;
}

export interface RevenueCatSubscription {
  store?: string | null;
  expires_date?: string | null;
  /** Set while a renewal is being retried — the customer still has access (SPEC §31). */
  grace_period_expires_date?: string | null;
  unsubscribe_detected_at?: string | null;
  billing_issues_detected_at?: string | null;
}

export interface RevenueCatSubscriber {
  entitlements?: Record<string, RevenueCatEntitlement> | null;
  subscriptions?: Record<string, RevenueCatSubscription> | null;
}

export interface SubscriberResponse {
  subscriber?: RevenueCatSubscriber | null;
}

/** What `apply_entitlements` expects, per entitlement id. */
export interface EntitlementRecord {
  is_active: boolean;
  expires_at: string | null;
  product_id: string | null;
  store: string | null;
}

export class RevenueCatError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'RevenueCatError';
  }
}

const parseDate = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * The later of the two dates, as an ISO string.
 *
 * A subscription in billing retry has an `expires_date` in the past and a
 * `grace_period_expires_date` in the future. RevenueCat considers that customer entitled and
 * so do we (SPEC §31) — taking the later of the two is how that belief is expressed.
 */
const effectiveExpiry = (
  entitlement: RevenueCatEntitlement,
  subscription: RevenueCatSubscription | undefined,
): { iso: string | null; at: number | null } => {
  const expires = parseDate(entitlement.expires_date);
  const grace = parseDate(subscription?.grace_period_expires_date);

  if (expires === null && grace === null) {
    // No expiry at all: a non-consumable, or a lifetime grant. Never lapses.
    return { iso: null, at: null };
  }

  const at = Math.max(expires ?? 0, grace ?? 0);
  return { iso: new Date(at).toISOString(), at };
};

/**
 * Turns a subscriber into the payload `apply_entitlements` reconciles against.
 *
 * Every entitlement RevenueCat knows about is included, active or not, because absence is
 * what revokes — so an expired one has to be present and false rather than simply missing.
 * (`apply_entitlements` would revoke it either way; being explicit keeps the two ends of this
 * honest about what they are saying.)
 */
export const entitlementsFromSubscriber = (
  response: SubscriberResponse | null | undefined,
  now: number = Date.now(),
): Record<string, EntitlementRecord> => {
  const subscriber = response?.subscriber;
  const entitlements = subscriber?.entitlements ?? {};
  const subscriptions = subscriber?.subscriptions ?? {};

  const result: Record<string, EntitlementRecord> = {};

  for (const [id, entitlement] of Object.entries(entitlements)) {
    if (!entitlement || typeof entitlement !== 'object') continue;

    const productId = entitlement.product_identifier ?? null;
    const subscription = productId ? subscriptions[productId] : undefined;
    const expiry = effectiveExpiry(entitlement, subscription);

    result[id] = {
      is_active: expiry.at === null || expiry.at > now,
      expires_at: expiry.iso,
      product_id: productId,
      store: subscription?.store ?? null,
    };
  }

  return result;
};

/**
 * Fetches the full subscriber.
 *
 * `fetchImpl` is a parameter so this is testable without a network. The secret key never
 * leaves the Edge Function environment (SPEC §56) — it is not, and must never become, an
 * `EXPO_PUBLIC_*` variable.
 */
export const fetchSubscriber = async (
  apiKey: string,
  appUserId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SubscriberResponse> => {
  const response = await fetchImpl(
    `${REVENUECAT_API}/subscribers/${encodeURIComponent(appUserId)}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    },
  );

  if (!response.ok) {
    // 404 means RevenueCat has never seen this app user id — which is a real answer, not a
    // failure: they have bought nothing. Anything else is worth failing on, so the webhook
    // returns non-2xx and RevenueCat retries it.
    if (response.status === 404) return { subscriber: { entitlements: {}, subscriptions: {} } };

    throw new RevenueCatError(
      response.status,
      `RevenueCat responded ${response.status} for subscriber lookup`,
    );
  }

  return (await response.json()) as SubscriberResponse;
};

export type CustomerDeletion = 'deleted' | 'not-found' | 'not-configured';

/**
 * Deletes the RevenueCat customer for an account being deleted (SPEC §41).
 *
 * Without a secret key this says so rather than pretending: an environment with no RevenueCat
 * project (local development without the key) has no customer to delete, and the caller
 * reports `not-configured`. Production always has the key — `sync-entitlements` cannot work
 * without it either.
 *
 * 404 is a real answer — RevenueCat never saw this learner — and counts as done.
 */
export const deleteCustomer = async (
  apiKey: string | undefined,
  appUserId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CustomerDeletion> => {
  if (!apiKey) return 'not-configured';

  const response = await fetchImpl(
    `${REVENUECAT_API}/subscribers/${encodeURIComponent(appUserId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    },
  );

  if (response.ok) return 'deleted';
  if (response.status === 404) return 'not-found';

  throw new RevenueCatError(
    response.status,
    `RevenueCat responded ${response.status} for customer deletion`,
  );
};

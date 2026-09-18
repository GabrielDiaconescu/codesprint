/**
 * Authorising and reading a RevenueCat webhook (SPEC §31).
 *
 * Runtime-agnostic, like its sibling: the Edge Function supplies the header and the configured
 * secret, and everything that decides whether to trust a delivery is a pure function with
 * tests.
 */

export type WebhookAuthResult = 'ok' | 'unauthorized' | 'not-configured';

/**
 * Compares two secrets without leaking their contents through timing.
 *
 * Over the public internet the signal is buried in network noise, so this is not the
 * difference between safe and unsafe. It costs three lines and removes the question, which is
 * the right trade for the one comparison standing between a stranger and every entitlement in
 * the database.
 */
const constantTimeEquals = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;

  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
};

/**
 * Whether a delivery may be trusted.
 *
 * Fails CLOSED when the secret is not configured. An unauthenticated webhook endpoint that
 * writes entitlements is a way for anyone who finds the URL to grant themselves Premium, so
 * "no secret set" must never mean "let everything through" — it means the function is
 * misconfigured and refuses to run.
 */
export const authorizeWebhook = (
  header: string | null | undefined,
  expected: string | null | undefined,
): WebhookAuthResult => {
  if (!expected || expected.trim() === '') return 'not-configured';
  if (!header) return 'unauthorized';

  // RevenueCat sends whatever string is configured in its dashboard. Accept it with or
  // without a `Bearer ` prefix, because the dashboard field does not enforce either.
  const presented = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : header;

  return constantTimeEquals(presented, expected) ? 'ok' : 'unauthorized';
};

export interface WebhookEvent {
  id?: string | null;
  type?: string | null;
  app_user_id?: string | null;
  original_app_user_id?: string | null;
  aliases?: string[] | null;
  /** Present on TRANSFER: the ids a subscription moved between. */
  transferred_from?: string[] | null;
  transferred_to?: string[] | null;
}

export interface WebhookBody {
  event?: WebhookEvent | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SyncTarget {
  /** The id to call the REST API with — may be an anonymous RevenueCat id. */
  lookupId: string;
  /** The Supabase user id to write entitlements for, or null if this is nobody we know. */
  appUserId: string | null;
}

export interface ParsedWebhook {
  eventId: string;
  eventType: string;
  /** Everybody whose entitlements this delivery could have changed. Usually one. */
  targets: SyncTarget[];
}

const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);

const isNonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

/**
 * Reads the parts of a delivery this product acts on, or null if it is unreadable.
 *
 * The app calls `Purchases.logIn(user.id)` after authentication (SPEC §12), so the Supabase
 * user id is normally `app_user_id`. It is not always: a purchase made before signing in is
 * attached to an anonymous `$RCAnonymousID:…`, and the real id turns up in `aliases` once the
 * two are merged. So the Supabase id is the first candidate that looks like one, while the id
 * used to call the REST API is whatever the event named — the one RevenueCat can resolve.
 *
 * A TRANSFER is the exception worth spelling out. A subscription moving between accounts
 * changes what BOTH of them are entitled to, and syncing only the destination would leave the
 * previous owner with access they no longer have (SPEC §31: account switching).
 */
export const parseWebhook = (body: WebhookBody | null | undefined): ParsedWebhook | null => {
  const event = body?.event;
  if (!event || typeof event !== 'object') return null;

  const eventId = typeof event.id === 'string' ? event.id.trim() : '';
  if (eventId === '') return null;

  const eventType = isNonEmpty(event.type) ? event.type : 'UNKNOWN';

  const candidates = [
    event.app_user_id,
    event.original_app_user_id,
    ...(Array.isArray(event.aliases) ? event.aliases : []),
  ];

  const targets: SyncTarget[] = [];
  const seen = new Set<string>();

  const add = (lookupId: unknown, appUserId: string | null) => {
    if (!isNonEmpty(lookupId) || seen.has(lookupId)) return;
    seen.add(lookupId);
    targets.push({ lookupId, appUserId });
  };

  const primaryLookup = candidates.find(isNonEmpty) ?? null;
  const primaryUser = candidates.find(isUuid) ?? null;
  add(primaryLookup, primaryUser);

  // Both sides of a transfer are Supabase ids in their own right, so each is looked up
  // directly rather than inferred from the other.
  for (const id of [
    ...(Array.isArray(event.transferred_from) ? event.transferred_from : []),
    ...(Array.isArray(event.transferred_to) ? event.transferred_to : []),
  ]) {
    add(id, isUuid(id) ? id : null);
  }

  if (targets.length === 0) return null;

  return { eventId, eventType, targets };
};

/**
 * Event types that change nothing about what anybody is entitled to.
 *
 * Deliberately a list of ONE. It is an allow-list of things to skip rather than a list of
 * things to handle, so a type RevenueCat adds after this ships causes a harmless extra
 * re-fetch instead of being silently ignored. A wasted API call is cheaper than a subscriber
 * whose access never updated.
 */
const INFORMATIONAL = new Set(['TEST']);

export const needsEntitlementSync = (eventType: string): boolean =>
  !INFORMATIONAL.has(eventType.toUpperCase());

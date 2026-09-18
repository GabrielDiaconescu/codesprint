import { authorizeWebhook, needsEntitlementSync, parseWebhook } from '../webhook';

/**
 * Webhook authorisation and parsing (SPEC §31, §53).
 *
 * The first describe block is the security boundary of the entire billing system: an
 * unauthenticated request that reaches `apply_entitlements` is a stranger granting themselves
 * Premium. Everything else here is about not losing an event.
 */

describe('authorizeWebhook', () => {
  it('accepts the configured secret', () => {
    expect(authorizeWebhook('s3cret', 's3cret')).toBe('ok');
  });

  it('accepts it with a Bearer prefix, because the dashboard field does not enforce either', () => {
    expect(authorizeWebhook('Bearer s3cret', 's3cret')).toBe('ok');
  });

  it('rejects the wrong secret', () => {
    expect(authorizeWebhook('nope', 's3cret')).toBe('unauthorized');
  });

  it('rejects a missing header', () => {
    expect(authorizeWebhook(null, 's3cret')).toBe('unauthorized');
  });

  it('rejects a prefix of the secret', () => {
    expect(authorizeWebhook('s3cre', 's3cret')).toBe('unauthorized');
  });

  /**
   * The most important assertion in this file. "No secret configured" must never mean "let
   * everything through" — that would make the endpoint a public entitlement grant for anyone
   * who found the URL.
   */
  it.each([undefined, null, '', '   '])('fails CLOSED when the secret is %p', (expected) => {
    expect(authorizeWebhook('anything', expected)).toBe('not-configured');
  });
});

describe('parseWebhook', () => {
  const event = (patch: Record<string, unknown> = {}) => ({
    event: {
      id: 'evt_1',
      type: 'INITIAL_PURCHASE',
      app_user_id: '11111111-1111-4111-8111-111111111111',
      ...patch,
    },
  });

  it('reads the event id, the type and the user', () => {
    const parsed = parseWebhook(event());

    expect(parsed?.eventId).toBe('evt_1');
    expect(parsed?.eventType).toBe('INITIAL_PURCHASE');
    expect(parsed?.targets).toEqual([
      {
        lookupId: '11111111-1111-4111-8111-111111111111',
        appUserId: '11111111-1111-4111-8111-111111111111',
      },
    ]);
  });

  /**
   * A purchase made before signing in is attached to an anonymous RevenueCat id; the real
   * Supabase id only appears in `aliases` once the two are merged. The lookup must use the id
   * RevenueCat can resolve, and the write must use the one this database knows.
   */
  it('looks up the anonymous id but writes to the Supabase one', () => {
    const parsed = parseWebhook(
      event({
        app_user_id: '$RCAnonymousID:abc123',
        aliases: ['$RCAnonymousID:abc123', '22222222-2222-4222-8222-222222222222'],
      }),
    );

    expect(parsed?.targets).toEqual([
      {
        lookupId: '$RCAnonymousID:abc123',
        appUserId: '22222222-2222-4222-8222-222222222222',
      },
    ]);
  });

  it('has nobody to write to when no id is a Supabase user', () => {
    const parsed = parseWebhook(event({ app_user_id: '$RCAnonymousID:abc123', aliases: [] }));

    expect(parsed?.targets[0]?.appUserId).toBeNull();
    expect(parsed?.targets[0]?.lookupId).toBe('$RCAnonymousID:abc123');
  });

  /** SPEC §31, account switching: a transfer changes what BOTH accounts are entitled to. */
  it('syncs both sides of a transfer', () => {
    const parsed = parseWebhook(
      event({
        type: 'TRANSFER',
        app_user_id: '11111111-1111-4111-8111-111111111111',
        transferred_from: ['11111111-1111-4111-8111-111111111111'],
        transferred_to: ['33333333-3333-4333-8333-333333333333'],
      }),
    );

    expect(parsed?.targets.map((target) => target.appUserId)).toEqual([
      '11111111-1111-4111-8111-111111111111',
      '33333333-3333-4333-8333-333333333333',
    ]);
  });

  it('does not list the same account twice', () => {
    const parsed = parseWebhook(
      event({
        type: 'TRANSFER',
        transferred_from: ['11111111-1111-4111-8111-111111111111'],
        transferred_to: ['11111111-1111-4111-8111-111111111111'],
      }),
    );

    expect(parsed?.targets).toHaveLength(1);
  });

  it('defaults an absent type rather than dropping the event', () => {
    expect(parseWebhook(event({ type: undefined }))?.eventType).toBe('UNKNOWN');
  });

  it.each([
    [null, 'nothing at all'],
    [{}, 'no event'],
    [{ event: null }, 'a null event'],
    [{ event: { type: 'RENEWAL' } }, 'no event id'],
    [{ event: { id: '   ', app_user_id: 'x' } }, 'a blank event id'],
    [{ event: { id: 'evt_1' } }, 'no app user id at all'],
  ])('returns null for %p — %s', (body, _description) => {
    expect(parseWebhook(body as never)).toBeNull();
  });
});

describe('needsEntitlementSync', () => {
  it('skips the dashboard test event', () => {
    expect(needsEntitlementSync('TEST')).toBe(false);
    expect(needsEntitlementSync('test')).toBe(false);
  });

  it.each([
    'INITIAL_PURCHASE',
    'RENEWAL',
    'CANCELLATION',
    'UNCANCELLATION',
    'EXPIRATION',
    'BILLING_ISSUE',
    'PRODUCT_CHANGE',
    'SUBSCRIPTION_PAUSED',
    'TRANSFER',
  ])('syncs on %s', (type) => {
    expect(needsEntitlementSync(type)).toBe(true);
  });

  it('syncs on a type that did not exist when this shipped', () => {
    // An allow-list of things to SKIP, so the failure mode is a wasted API call rather than a
    // subscriber whose access silently never updated.
    expect(needsEntitlementSync('SOME_FUTURE_EVENT')).toBe(true);
  });
});

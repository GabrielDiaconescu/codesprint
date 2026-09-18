import {
  RevenueCatError,
  entitlementsFromSubscriber,
  fetchSubscriber,
  type SubscriberResponse,
} from '../revenuecat';

/**
 * Reading a RevenueCat subscriber (SPEC §31, §53).
 *
 * This is the code that decides whether somebody has paid, so the cases that matter are the
 * awkward ones: an expired entitlement, a subscription in billing retry, a lifetime purchase
 * with no expiry at all, and a customer RevenueCat has never heard of.
 */

const NOW = Date.parse('2026-09-18T12:00:00Z');
const future = '2026-10-18T12:00:00Z';
const past = '2026-08-18T12:00:00Z';

const subscriber = (patch: Partial<SubscriberResponse['subscriber']> = {}): SubscriberResponse => ({
  subscriber: { entitlements: {}, subscriptions: {}, ...patch },
});

describe('entitlementsFromSubscriber', () => {
  it('reads an active subscription', () => {
    const result = entitlementsFromSubscriber(
      subscriber({
        entitlements: { premium: { expires_date: future, product_identifier: 'premium_monthly' } },
        subscriptions: { premium_monthly: { store: 'app_store', expires_date: future } },
      }),
      NOW,
    );

    expect(result.premium).toEqual({
      is_active: true,
      expires_at: new Date(Date.parse(future)).toISOString(),
      product_id: 'premium_monthly',
      store: 'app_store',
    });
  });

  it('marks an expired entitlement inactive rather than leaving it out', () => {
    // It has to be PRESENT and false: `apply_entitlements` treats absence as revocation, so
    // saying so explicitly keeps both ends of this honest about what they mean.
    const result = entitlementsFromSubscriber(
      subscriber({
        entitlements: { premium: { expires_date: past, product_identifier: 'premium_monthly' } },
        subscriptions: { premium_monthly: { store: 'play_store', expires_date: past } },
      }),
      NOW,
    );

    expect(result.premium?.is_active).toBe(false);
  });

  /** SPEC §31: trust RevenueCat's active state through a billing retry. */
  it('keeps a subscription in its grace period active', () => {
    const result = entitlementsFromSubscriber(
      subscriber({
        entitlements: { premium: { expires_date: past, product_identifier: 'premium_monthly' } },
        subscriptions: {
          premium_monthly: {
            store: 'app_store',
            expires_date: past,
            grace_period_expires_date: future,
            billing_issues_detected_at: past,
          },
        },
      }),
      NOW,
    );

    expect(result.premium?.is_active).toBe(true);
    expect(result.premium?.expires_at).toBe(new Date(Date.parse(future)).toISOString());
  });

  it('does not resurrect a subscription whose grace period has also passed', () => {
    const result = entitlementsFromSubscriber(
      subscriber({
        entitlements: { premium: { expires_date: past, product_identifier: 'premium_monthly' } },
        subscriptions: {
          premium_monthly: { expires_date: past, grace_period_expires_date: past },
        },
      }),
      NOW,
    );

    expect(result.premium?.is_active).toBe(false);
  });

  it('treats a missing expiry as never lapsing', () => {
    // A non-consumable "Remove Ads" (D2's alternative) or a lifetime grant.
    const result = entitlementsFromSubscriber(
      subscriber({
        entitlements: { no_ads: { expires_date: null, product_identifier: 'no_ads_lifetime' } },
      }),
      NOW,
    );

    expect(result.no_ads).toEqual({
      is_active: true,
      expires_at: null,
      product_id: 'no_ads_lifetime',
      store: null,
    });
  });

  it('carries both entitlements when a Premium product grants both (SPEC §32)', () => {
    const result = entitlementsFromSubscriber(
      subscriber({
        entitlements: {
          premium: { expires_date: future, product_identifier: 'premium_annual' },
          no_ads: { expires_date: future, product_identifier: 'premium_annual' },
        },
        subscriptions: { premium_annual: { store: 'play_store', expires_date: future } },
      }),
      NOW,
    );

    expect(result.premium?.is_active).toBe(true);
    expect(result.no_ads?.is_active).toBe(true);
    expect(result.no_ads?.store).toBe('play_store');
  });

  it('passes through an entitlement id this build has never heard of', () => {
    // The database skips it. Filtering here too would hide a dashboard misconfiguration.
    const result = entitlementsFromSubscriber(
      subscriber({ entitlements: { some_future_tier: { expires_date: future } } }),
      NOW,
    );

    expect(result.some_future_tier?.is_active).toBe(true);
  });

  it('is empty for a customer with nothing', () => {
    expect(entitlementsFromSubscriber(subscriber(), NOW)).toEqual({});
  });

  it.each([null, undefined, {}, { subscriber: null }])('survives %p', (value) => {
    expect(entitlementsFromSubscriber(value as SubscriberResponse, NOW)).toEqual({});
  });
});

describe('fetchSubscriber', () => {
  const ok = (body: unknown) =>
    jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });

  it('calls the subscriber endpoint with the secret key', async () => {
    const fetchImpl = ok(subscriber());
    await fetchSubscriber('sk_test', 'user-1', fetchImpl as unknown as typeof fetch);

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.revenuecat.com/v1/subscribers/user-1',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer sk_test' }),
      }),
    );
  });

  it('escapes an app user id that needs it', async () => {
    const fetchImpl = ok(subscriber());
    await fetchSubscriber('sk', '$RCAnonymousID:abc/def', fetchImpl as unknown as typeof fetch);

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      'https://api.revenuecat.com/v1/subscribers/%24RCAnonymousID%3Aabc%2Fdef',
    );
  });

  it('treats an unknown customer as one who has bought nothing', async () => {
    // A 404 is a real answer, not a failure — returning it as empty means the webhook
    // acknowledges the delivery instead of retrying forever.
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 404 });
    const result = await fetchSubscriber('sk', 'nobody', fetchImpl as unknown as typeof fetch);

    expect(entitlementsFromSubscriber(result)).toEqual({});
  });

  it('throws on any other failure, so the delivery is retried', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(
      fetchSubscriber('sk', 'user-1', fetchImpl as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(RevenueCatError);
  });
});

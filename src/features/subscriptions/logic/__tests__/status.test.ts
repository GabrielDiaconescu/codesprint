import { NO_SERVER_ENTITLEMENTS, type ServerEntitlements } from '@/services';

import { canUpgrade, subscriptionStatus } from '../status';

/**
 * What Settings tells a paying customer they have (SPEC §29).
 *
 * The ranking is the whole point: Premium grants `no_ads` too, so a Premium subscriber holds
 * both entitlements, and naming the cheaper one is the kind of mistake that ends in a support
 * email and a refund.
 */
const entitlements = (patch: Partial<ServerEntitlements> = {}): ServerEntitlements => ({
  ...NO_SERVER_ENTITLEMENTS,
  ...patch,
});

describe('subscriptionStatus', () => {
  it('is free for somebody who has never bought anything', () => {
    expect(subscriptionStatus(NO_SERVER_ENTITLEMENTS)).toEqual({
      plan: 'free',
      isLifetime: false,
      endsAt: null,
    });
  });

  it('names Premium, not No Ads, for a subscriber who holds both', () => {
    const status = subscriptionStatus(
      entitlements({
        active: ['no_ads', 'premium'],
        is_premium: true,
        is_ad_free: true,
        premium_expires_at: '2026-10-19T10:00:00Z',
      }),
    );

    expect(status.plan).toBe('premium');
    expect(status.endsAt).toBe('2026-10-19T10:00:00Z');
  });

  it('reports a No Ads subscription with its renewal date', () => {
    const status = subscriptionStatus(
      entitlements({
        active: ['no_ads'],
        is_ad_free: true,
        no_ads_expires_at: '2026-10-19T10:00:00Z',
      }),
    );

    expect(status).toEqual({
      plan: 'no_ads',
      isLifetime: false,
      endsAt: '2026-10-19T10:00:00Z',
    });
  });

  it('reports a lifetime No Ads purchase as never ending', () => {
    // A null expiry WHILE the entitlement is active is what a one-time purchase looks like
    // (D2). Showing this customer a renewal date would be inventing one.
    const status = subscriptionStatus(
      entitlements({
        active: ['no_ads'],
        is_ad_free: true,
        no_ads_expires_at: null,
        no_ads_product_id: 'no_ads_lifetime',
      }),
    );

    expect(status).toEqual({ plan: 'no_ads', isLifetime: true, endsAt: null });
  });

  it('does not call a Premium subscription lifetime just because no expiry came back', () => {
    const status = subscriptionStatus(
      entitlements({ active: ['premium'], is_premium: true, premium_expires_at: null }),
    );

    expect(status.isLifetime).toBe(false);
  });
});

describe('canUpgrade', () => {
  it.each([
    ['free', NO_SERVER_ENTITLEMENTS],
    ['no_ads', entitlements({ active: ['no_ads'], is_ad_free: true })],
  ] as const)('offers an upgrade to a %s learner', (_name, held) => {
    expect(canUpgrade(subscriptionStatus(held))).toBe(true);
  });

  it('offers nothing above Premium, because there is nothing above Premium', () => {
    expect(
      canUpgrade(subscriptionStatus(entitlements({ active: ['premium'], is_premium: true }))),
    ).toBe(false);
  });
});

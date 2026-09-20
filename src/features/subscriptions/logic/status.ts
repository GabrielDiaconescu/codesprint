import type { ServerEntitlements } from '@/services';

/**
 * What to tell a learner about what they are paying for (SPEC §29).
 *
 * Read from the SERVER's entitlements, never from the store SDK: the SDK reflects what this
 * device last heard, and somebody who bought on another phone must still see their plan here
 * (SPEC §31).
 *
 * Kept pure because the interesting part is not the rendering but the ranking — Premium
 * grants `no_ads` as well, so a Premium subscriber holds both, and showing them "No Ads" when
 * they pay for Premium would be wrong in the one place where being wrong costs a refund.
 */

export type SubscriptionPlan = 'free' | 'no_ads' | 'premium';

export interface SubscriptionStatus {
  plan: SubscriptionPlan;
  /**
   * True for a No Ads purchase that never lapses (D2).
   *
   * A lifetime owner must not be shown a renewal date, and must not be told their access is
   * about to end.
   */
  isLifetime: boolean;
  /** ISO timestamp the current access runs to, or null when it does not end. */
  endsAt: string | null;
}

export const subscriptionStatus = (entitlements: ServerEntitlements): SubscriptionStatus => {
  if (entitlements.is_premium) {
    return {
      plan: 'premium',
      // Premium is a subscription in every shipped product, so "no expiry" here means the
      // server has not told us one — not that it lasts forever.
      isLifetime: false,
      endsAt: entitlements.premium_expires_at,
    };
  }

  if (entitlements.active.includes('no_ads')) {
    const isLifetime = entitlements.no_ads_expires_at === null;

    return {
      plan: 'no_ads',
      isLifetime,
      endsAt: isLifetime ? null : entitlements.no_ads_expires_at,
    };
  }

  return { plan: 'free', isLifetime: false, endsAt: null };
};

/**
 * Whether there is anything left to buy.
 *
 * A Premium subscriber is offered nothing, because there is nothing above it — showing them
 * an upgrade button would be a promise the product cannot keep.
 */
export const canUpgrade = (status: SubscriptionStatus): boolean => status.plan !== 'premium';

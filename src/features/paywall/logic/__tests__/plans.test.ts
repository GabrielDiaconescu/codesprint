import type { StoreProduct } from '@/services';
import { PACKAGES } from '@/services/billing/config';

import {
  annualSavingPercent,
  buildPlans,
  formatMicros,
  hasBuyablePlan,
  planState,
  type HeldEntitlements,
} from '../plans';

/**
 * Turning Offerings into a paywall (SPEC §32, §33).
 *
 * The assertions worth caring about are the ones about what a customer is TOLD: that somebody
 * who already pays is never sold the same thing twice, that an upgrade is labelled as one, and
 * that a saving badge is only shown when there is a real saving to show.
 */

const product = (role: keyof typeof PACKAGES, patch: Partial<StoreProduct> = {}): StoreProduct => ({
  packageId: PACKAGES[role].packageId,
  productId: PACKAGES[role].productId,
  localizedPrice: '€7.99',
  priceAmountMicros: 7_990_000,
  currencyCode: 'EUR',
  billingPeriod: PACKAGES[role].billingPeriod,
  entitlements: PACKAGES[role].entitlements,
  ...patch,
});

/** Nothing held. */
const nothing: HeldEntitlements = { active: [], noAdsExpiresAt: null };

/** No Ads bought as a monthly subscription — replaceable by an upgrade. */
const noAdsSubscription: HeldEntitlements = {
  active: ['no_ads'],
  noAdsExpiresAt: '2099-01-01T00:00:00Z',
};

/** No Ads bought outright (D2). A non-consumable cannot be replaced. */
const noAdsForever: HeldEntitlements = { active: ['no_ads'], noAdsExpiresAt: null };

const premium: HeldEntitlements = {
  active: ['no_ads', 'premium'],
  noAdsExpiresAt: '2099-01-01T00:00:00Z',
};

const noAds = product('no_ads_monthly', { localizedPrice: '€2.99', priceAmountMicros: 2_990_000 });
const noAdsLifetime = product('no_ads_lifetime', {
  localizedPrice: '€19.99',
  priceAmountMicros: 19_990_000,
});
const premiumMonthly = product('premium_monthly');
const premiumAnnual = product('premium_annual', {
  localizedPrice: '€59.99',
  priceAmountMicros: 59_990_000,
});

describe('planState', () => {
  it('is available to somebody with nothing', () => {
    expect(planState('premium_monthly', nothing)).toBe('available');
    expect(planState('no_ads_monthly', nothing)).toBe('available');
  });

  it('is owned when they already hold exactly it', () => {
    expect(planState('no_ads_monthly', noAdsSubscription)).toBe('owned');
  });

  it('calls No Ads "superseded" for a Premium subscriber, not "owned"', () => {
    // They do have it — Premium grants both (SPEC §32) — but the honest message is "included",
    // and it must not be offered for sale again.
    expect(planState('no_ads_monthly', premium)).toBe('superseded');
  });

  it('never offers Premium to a Premium subscriber', () => {
    expect(planState('premium_monthly', premium)).toBe('owned');
    expect(planState('premium_annual', premium)).toBe('owned');
  });

  it('labels Premium an upgrade for a No Ads subscriber', () => {
    // SPEC §5: this replaces the cheaper subscription rather than adding to it, and the
    // customer is told so before they tap.
    expect(planState('premium_monthly', noAdsSubscription)).toBe('upgrade');
    expect(planState('premium_annual', noAdsSubscription)).toBe('upgrade');
  });
});

describe('buildPlans', () => {
  it('orders the smallest commitment first', () => {
    const plans = buildPlans([premiumAnnual, premiumMonthly, noAds], nothing);
    expect(plans.map((plan) => plan.role)).toEqual([
      'no_ads_monthly',
      'premium_monthly',
      'premium_annual',
    ]);
  });

  it('drops a package this build does not know about', () => {
    // A dashboard reconfigured ahead of a release must not put an unrecognised product in
    // front of a customer with no copy to describe it.
    const plans = buildPlans(
      [premiumMonthly, { ...premiumMonthly, packageId: '$rc_weekly_mystery' }],
      nothing,
    );
    expect(plans).toHaveLength(1);
  });

  it('computes the monthly equivalent of an annual plan', () => {
    const plans = buildPlans([premiumAnnual], nothing);
    expect(plans[0]?.monthlyEquivalentMicros).toBe(Math.round(59_990_000 / 12));
  });

  it('leaves a monthly plan without a monthly equivalent', () => {
    expect(buildPlans([premiumMonthly], nothing)[0]?.monthlyEquivalentMicros).toBeNull();
  });

  it('marks exactly one plan as recommended', () => {
    const plans = buildPlans([noAds, premiumMonthly, premiumAnnual], nothing);
    expect(plans.filter((plan) => plan.recommended)).toHaveLength(1);
  });

  it('is empty when the store returned nothing', () => {
    expect(buildPlans([], nothing)).toEqual([]);
  });
});

describe('annualSavingPercent', () => {
  it('compares the annual price against twelve months', () => {
    // 59.99 against 12 x 7.99 = 95.88 → 37%.
    expect(annualSavingPercent(buildPlans([premiumMonthly, premiumAnnual], nothing))).toBe(37);
  });

  it('is null when there is nothing to compare against', () => {
    expect(annualSavingPercent(buildPlans([premiumAnnual], nothing))).toBeNull();
  });

  it('is null when the annual plan is not actually cheaper', () => {
    // A badge saying "save 0%" is the kind of half-true number SPEC §33 forbids.
    const expensive = { ...premiumAnnual, priceAmountMicros: 7_990_000 * 12 };
    expect(annualSavingPercent(buildPlans([premiumMonthly, expensive], nothing))).toBeNull();
  });

  it('is null across different currencies, where the subtraction would be meaningless', () => {
    const inDollars = { ...premiumAnnual, currencyCode: 'USD' };
    expect(annualSavingPercent(buildPlans([premiumMonthly, inDollars], nothing))).toBeNull();
  });
});

describe('formatMicros', () => {
  it('formats in the product currency', () => {
    expect(formatMicros(4_999_167, 'EUR', 'en-GB')).toContain('5.00');
  });

  it('uses the currency the store quoted, not the device locale', () => {
    expect(formatMicros(1_000_000, 'RON', 'en-GB')).toContain('RON');
  });
});

describe('hasBuyablePlan', () => {
  it('is true when something can be bought', () => {
    expect(hasBuyablePlan(buildPlans([premiumMonthly], nothing))).toBe(true);
  });

  it('is true for an upgrade', () => {
    expect(hasBuyablePlan(buildPlans([premiumMonthly], noAdsSubscription))).toBe(true);
  });

  it('is false when the customer already has everything', () => {
    expect(hasBuyablePlan(buildPlans([noAds, premiumMonthly], premium))).toBe(false);
  });

  it('is false when the store returned nothing', () => {
    expect(hasBuyablePlan([])).toBe(false);
  });
});

describe('a lifetime No Ads purchase (D2)', () => {
  it('is owned once bought', () => {
    expect(planState('no_ads_lifetime', noAdsForever)).toBe('owned');
  });

  /**
   * The assertion this whole distinction exists for. Telling somebody holding a permanent
   * purchase that Premium "replaces your current subscription — you are not charged for both"
   * is simply false: they keep the non-consumable and pay for Premium as well (SPEC §33).
   */
  it('makes Premium an ADD-ON rather than an upgrade', () => {
    expect(planState('premium_monthly', noAdsForever)).toBe('add-on');
    expect(planState('premium_annual', noAdsForever)).toBe('add-on');
  });

  it('still makes Premium an upgrade for a No Ads SUBSCRIBER', () => {
    expect(planState('premium_monthly', noAdsSubscription)).toBe('upgrade');
  });

  it('is superseded for a Premium subscriber, like the monthly one', () => {
    expect(planState('no_ads_lifetime', premium)).toBe('superseded');
  });

  it('marks the monthly No Ads owned too — the entitlement is what they hold', () => {
    // Deliberately blunt: the card reads "you already have this" rather than "your current
    // plan", which would be untrue on whichever of the two they did not buy.
    expect(planState('no_ads_monthly', noAdsForever)).toBe('owned');
  });

  it('never carries a monthly equivalent — there is no month to divide by', () => {
    expect(buildPlans([noAdsLifetime], nothing)[0]?.monthlyEquivalentMicros).toBeNull();
  });

  it('sits next to the monthly No Ads, before Premium', () => {
    const plans = buildPlans([premiumMonthly, noAdsLifetime, noAds], nothing);
    expect(plans.map((plan) => plan.role)).toEqual([
      'no_ads_monthly',
      'no_ads_lifetime',
      'premium_monthly',
    ]);
  });

  it('counts as something worth showing the paywall for', () => {
    expect(hasBuyablePlan(buildPlans([premiumMonthly], noAdsForever))).toBe(true);
  });
});

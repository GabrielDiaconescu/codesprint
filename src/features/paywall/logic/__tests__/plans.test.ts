import type { StoreProduct } from '@/services';
import { PACKAGES } from '@/services/billing/config';

import { annualSavingPercent, buildPlans, formatMicros, hasBuyablePlan, planState } from '../plans';

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

const noAds = product('no_ads_monthly', { localizedPrice: '€2.99', priceAmountMicros: 2_990_000 });
const premiumMonthly = product('premium_monthly');
const premiumAnnual = product('premium_annual', {
  localizedPrice: '€59.99',
  priceAmountMicros: 59_990_000,
});

describe('planState', () => {
  it('is available to somebody with nothing', () => {
    expect(planState('premium_monthly', [])).toBe('available');
    expect(planState('no_ads_monthly', [])).toBe('available');
  });

  it('is owned when they already hold exactly it', () => {
    expect(planState('no_ads_monthly', ['no_ads'])).toBe('owned');
  });

  it('calls No Ads "superseded" for a Premium subscriber, not "owned"', () => {
    // They do have it — Premium grants both (SPEC §32) — but the honest message is "included",
    // and it must not be offered for sale again.
    expect(planState('no_ads_monthly', ['no_ads', 'premium'])).toBe('superseded');
  });

  it('never offers Premium to a Premium subscriber', () => {
    expect(planState('premium_monthly', ['no_ads', 'premium'])).toBe('owned');
    expect(planState('premium_annual', ['no_ads', 'premium'])).toBe('owned');
  });

  it('labels Premium an upgrade for a No Ads subscriber', () => {
    // SPEC §5: this replaces the cheaper subscription rather than adding to it, and the
    // customer is told so before they tap.
    expect(planState('premium_monthly', ['no_ads'])).toBe('upgrade');
    expect(planState('premium_annual', ['no_ads'])).toBe('upgrade');
  });
});

describe('buildPlans', () => {
  it('orders the smallest commitment first', () => {
    const plans = buildPlans([premiumAnnual, premiumMonthly, noAds], []);
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
      [],
    );
    expect(plans).toHaveLength(1);
  });

  it('computes the monthly equivalent of an annual plan', () => {
    const plans = buildPlans([premiumAnnual], []);
    expect(plans[0]?.monthlyEquivalentMicros).toBe(Math.round(59_990_000 / 12));
  });

  it('leaves a monthly plan without a monthly equivalent', () => {
    expect(buildPlans([premiumMonthly], [])[0]?.monthlyEquivalentMicros).toBeNull();
  });

  it('marks exactly one plan as recommended', () => {
    const plans = buildPlans([noAds, premiumMonthly, premiumAnnual], []);
    expect(plans.filter((plan) => plan.recommended)).toHaveLength(1);
  });

  it('is empty when the store returned nothing', () => {
    expect(buildPlans([], [])).toEqual([]);
  });
});

describe('annualSavingPercent', () => {
  it('compares the annual price against twelve months', () => {
    // 59.99 against 12 x 7.99 = 95.88 → 37%.
    expect(annualSavingPercent(buildPlans([premiumMonthly, premiumAnnual], []))).toBe(37);
  });

  it('is null when there is nothing to compare against', () => {
    expect(annualSavingPercent(buildPlans([premiumAnnual], []))).toBeNull();
  });

  it('is null when the annual plan is not actually cheaper', () => {
    // A badge saying "save 0%" is the kind of half-true number SPEC §33 forbids.
    const expensive = { ...premiumAnnual, priceAmountMicros: 7_990_000 * 12 };
    expect(annualSavingPercent(buildPlans([premiumMonthly, expensive], []))).toBeNull();
  });

  it('is null across different currencies, where the subtraction would be meaningless', () => {
    const inDollars = { ...premiumAnnual, currencyCode: 'USD' };
    expect(annualSavingPercent(buildPlans([premiumMonthly, inDollars], []))).toBeNull();
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
    expect(hasBuyablePlan(buildPlans([premiumMonthly], []))).toBe(true);
  });

  it('is true for an upgrade', () => {
    expect(hasBuyablePlan(buildPlans([premiumMonthly], ['no_ads']))).toBe(true);
  });

  it('is false when the customer already has everything', () => {
    expect(hasBuyablePlan(buildPlans([noAds, premiumMonthly], ['no_ads', 'premium']))).toBe(false);
  });

  it('is false when the store returned nothing', () => {
    expect(hasBuyablePlan([])).toBe(false);
  });
});

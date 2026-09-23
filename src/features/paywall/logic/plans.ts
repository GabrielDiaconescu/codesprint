import { PACKAGES, roleForPackage, type PackageRole } from '@/services/billing/config';
import type { EntitlementId, StoreProduct } from '@/services';

/**
 * Turning RevenueCat Offerings into a paywall (SPEC §32, §33).
 *
 * Pure, and pure for a reason that is not only testability: this is the code that decides what
 * a customer is told they are about to pay for. Getting "upgrade" wrong, or showing a plan
 * somebody already owns as buyable, is the kind of mistake that ends up in a refund request.
 *
 * What is NOT here: prices. `localizedPrice` arrives from the store already formatted for the
 * customer's country, and the only arithmetic performed on it is dividing the ANNUAL price by
 * twelve for comparison — from `priceAmountMicros`, in the same currency, never by parsing a
 * formatted string.
 */

export type PlanState =
  /** Buyable. */
  | 'available'
  /** Already held — the same entitlements, so there is nothing to buy. */
  | 'owned'
  /** Held at a higher tier: Premium makes No Ads pointless. */
  | 'superseded'
  /** Buyable, and REPLACES a cheaper subscription rather than adding to it (SPEC §5). */
  | 'upgrade'
  /**
   * Buyable, and sits ALONGSIDE something permanent they keep.
   *
   * Only reachable via D2's lifetime No Ads: a non-consumable cannot be replaced by a
   * subscription, so calling this an upgrade would promise they will not be charged twice
   * when they will be (SPEC §33).
   */
  | 'add-on';

/**
 * What the learner currently holds, as the SERVER reports it.
 *
 * `noAdsExpiresAt` is null for a lifetime purchase and a date for a subscription — the one
 * fact that decides between `upgrade` and `add-on`.
 */
export interface HeldEntitlements {
  active: EntitlementId[];
  noAdsExpiresAt: string | null;
}

export interface Plan {
  role: PackageRole;
  product: StoreProduct;
  state: PlanState;
  recommended: boolean;
  /** Price per month for an annual plan, in micros. Null for a monthly one. */
  monthlyEquivalentMicros: number | null;
}

const MONTHS_PER_YEAR = 12;

const grants = (role: PackageRole): EntitlementId[] => PACKAGES[role].entitlements;

/**
 * What the customer can do with this plan given what they already hold.
 *
 * The order matters. "Owned" is checked before "upgrade", so a Premium subscriber is never
 * offered Premium again; and No Ads is "superseded" rather than "owned" for a Premium
 * subscriber, because the honest message is "you already have this" and not "buy it".
 */
export const planState = (role: PackageRole, held: HeldEntitlements): PlanState => {
  const { active, noAdsExpiresAt } = held;
  const needed = grants(role);
  const hasAll = needed.every((entitlement) => active.includes(entitlement));

  if (hasAll) {
    // Premium covers No Ads, so the cheaper plan is not something to sell them.
    return needed.includes('premium') || !active.includes('premium') ? 'owned' : 'superseded';
  }

  if (active.includes('no_ads') && needed.includes('premium')) {
    // A subscription is replaced; a lifetime purchase is kept and paid alongside. Saying
    // "you are not charged for both" to the second kind would simply be untrue.
    return noAdsExpiresAt === null ? 'add-on' : 'upgrade';
  }

  return 'available';
};

/**
 * The plans to render, in the order the paywall shows them.
 *
 * Products RevenueCat returns that this build does not know about are dropped: a dashboard
 * that has been reconfigured ahead of a release must not put an unrecognised package in front
 * of a customer with no copy to describe it.
 */
export const buildPlans = (products: StoreProduct[], held: HeldEntitlements): Plan[] => {
  const plans: Plan[] = [];

  for (const product of products) {
    const role = roleForPackage(product.packageId) ?? null;
    if (role === null) continue;

    plans.push({
      role,
      product,
      state: planState(role, held),
      recommended: PACKAGES[role].recommended,
      monthlyEquivalentMicros:
        product.billingPeriod === 'annual'
          ? Math.round(product.priceAmountMicros / MONTHS_PER_YEAR)
          : null,
    });
  }

  // Cheapest first within a tier, No Ads before Premium: the customer sees the smallest
  // commitment first rather than being led with the most expensive (SPEC §33).
  const order: PackageRole[] = [
    'no_ads_monthly',
    'no_ads_lifetime',
    'premium_monthly',
    'premium_annual',
  ];
  return plans.sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
};

/**
 * How much an annual plan saves against the monthly one, as a percentage.
 *
 * Null unless BOTH are present and the annual one is genuinely cheaper. A "save 0%" badge, or
 * one computed against a price that was not on screen, is the sort of half-true number SPEC
 * §33 forbids.
 */
export const annualSavingPercent = (plans: Plan[]): number | null => {
  const annual = plans.find((plan) => plan.role === 'premium_annual');
  const monthly = plans.find((plan) => plan.role === 'premium_monthly');

  if (!annual || !monthly) return null;
  if (annual.product.currencyCode !== monthly.product.currencyCode) return null;

  const yearlyAtMonthlyRate = monthly.product.priceAmountMicros * MONTHS_PER_YEAR;
  if (yearlyAtMonthlyRate <= 0) return null;

  const saving = 1 - annual.product.priceAmountMicros / yearlyAtMonthlyRate;
  const percent = Math.round(saving * 100);

  return percent > 0 ? percent : null;
};

/** Formats a micro-price in the product's own currency, using the device's conventions. */
export const formatMicros = (micros: number, currencyCode: string, locale: string): string =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(
    micros / 1_000_000,
  );

/**
 * Whether the paywall has anything to sell at all.
 *
 * An empty offering is an error state with a retry, never a screen with the prices missing and
 * never a screen with prices invented (SPEC §31: no fallback hardcoded prices).
 */
export const hasBuyablePlan = (plans: Plan[]): boolean =>
  plans.some(
    (plan) => plan.state === 'available' || plan.state === 'upgrade' || plan.state === 'add-on',
  );

/**
 * Whether a plan must say in so many words that it does not unlock Premium (SPEC §33).
 *
 * Decided by what the plan GRANTS, not by its name: keyed on `no_ads_monthly` alone, the
 * statement silently disappeared from the paywall when the offering moved to the lifetime
 * No Ads product (D2) — which the E2E paywall flow caught.
 */
export const needsNoAdsDisclaimer = (role: PackageRole): boolean => {
  const granted = grants(role);
  return granted.includes('no_ads') && !granted.includes('premium');
};

export type PurchaseAction = 'subscribe' | 'buyOnce' | 'upgrade';

/**
 * The purchase button's wording. "Subscribe" only for something that renews: on a one-off
 * purchase it would describe a commitment the customer is not making (SPEC §33).
 */
export const purchaseAction = (
  state: PlanState,
  billingPeriod: StoreProduct['billingPeriod'],
): PurchaseAction => {
  if (state === 'upgrade') return 'upgrade';
  return billingPeriod === 'lifetime' ? 'buyOnce' : 'subscribe';
};

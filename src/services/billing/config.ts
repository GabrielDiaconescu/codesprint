import type { EntitlementId } from '../types';

/**
 * Billing configuration (SPEC §32).
 *
 * **Every product identifier in this codebase lives here and nowhere else.** Store product ids
 * are permanent — neither Apple nor Google lets you rename or reuse one — so they are chosen
 * once, written down once, and referred to by role everywhere else. Adding an annual plan or a
 * regional variant should be a change to this file and nothing more.
 *
 * What is NOT here, and must never be: prices. They come from RevenueCat Offerings, localized
 * by the store for the customer's country (SPEC §0.1.5, §33). A price written in code is wrong
 * in every currency but one, and wrong everywhere the moment it changes.
 */

/** RevenueCat entitlement identifiers. These must match the dashboard exactly. */
export const ENTITLEMENTS: Record<'noAds' | 'premium', EntitlementId> = {
  noAds: 'no_ads',
  premium: 'premium',
};

/** The offering the paywall renders. Changing which products are sold is a dashboard change. */
export const OFFERING_ID = 'default';

export type PackageRole =
  'no_ads_monthly' | 'no_ads_lifetime' | 'premium_monthly' | 'premium_annual';

export interface PackageConfig {
  /** The RevenueCat package identifier within the offering. */
  packageId: string;
  /** The store product identifier. Permanent once created (SPEC §5). */
  productId: string;
  billingPeriod: 'monthly' | 'annual' | 'lifetime';
  /**
   * What the purchase grants. Premium grants BOTH, which is why `isAdFree` is
   * `no_ads || premium` everywhere (SPEC §32).
   */
  entitlements: EntitlementId[];
  /** Highlighted on the paywall. Exactly one, and never through a pre-selected checkbox. */
  recommended: boolean;
}

export const PACKAGES: Record<PackageRole, PackageConfig> = {
  no_ads_monthly: {
    packageId: '$rc_monthly_no_ads',
    productId: 'no_ads_monthly',
    billingPeriod: 'monthly',
    entitlements: ['no_ads'],
    recommended: false,
  },
  /**
   * D2's alternative: No Ads as a one-time non-consumable rather than a subscription.
   *
   * Both may be offered at once — RevenueCat's `default` offering decides which actually
   * appear, and a package missing from it simply does not render. What matters in code is
   * that a lifetime purchase can never be "replaced" by an upgrade, which is why
   * `planState` asks whether the held entitlement expires.
   */
  no_ads_lifetime: {
    packageId: '$rc_lifetime',
    productId: 'no_ads_lifetime',
    billingPeriod: 'lifetime',
    entitlements: ['no_ads'],
    recommended: false,
  },
  premium_monthly: {
    packageId: '$rc_monthly',
    productId: 'premium_monthly',
    billingPeriod: 'monthly',
    entitlements: ['no_ads', 'premium'],
    recommended: true,
  },
  premium_annual: {
    packageId: '$rc_annual',
    productId: 'premium_annual',
    billingPeriod: 'annual',
    entitlements: ['no_ads', 'premium'],
    recommended: false,
  },
};

export const PACKAGE_ROLES = Object.keys(PACKAGES) as PackageRole[];

/** The role a store product id belongs to, or null for one this build does not sell. */
export const roleForProduct = (productId: string): PackageRole | null =>
  PACKAGE_ROLES.find((role) => PACKAGES[role].productId === productId) ?? null;

/** The role a RevenueCat package identifier belongs to. */
export const roleForPackage = (packageId: string): PackageRole | null =>
  PACKAGE_ROLES.find((role) => PACKAGES[role].packageId === packageId) ?? null;

/**
 * Which RevenueCat SDK key to configure with.
 *
 * Pure, so the rule that keeps simulated purchases out of a released app is a unit test rather
 * than a thing to remember. The Test Store key wins outside production because that is the
 * whole point of having it — one key, no platform, no store account — and it is rejected by
 * env validation in production before this is ever reached.
 */
export interface SdkKeys {
  ios?: string | undefined;
  android?: string | undefined;
  test?: string | undefined;
}

export type SdkKeyChoice =
  { key: string; source: 'test-store' | 'store' } | { key: null; source: 'missing' };

export const selectSdkKey = (
  platform: 'ios' | 'android',
  keys: SdkKeys,
  isProduction: boolean,
): SdkKeyChoice => {
  if (!isProduction && keys.test) {
    return { key: keys.test, source: 'test-store' };
  }

  const storeKey = platform === 'ios' ? keys.ios : keys.android;
  return storeKey ? { key: storeKey, source: 'store' } : { key: null, source: 'missing' };
};

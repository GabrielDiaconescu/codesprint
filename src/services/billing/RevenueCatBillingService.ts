import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';

import { getEnv, isProduction } from '@/lib/env';

import type { BillingService, CustomerEntitlements, EntitlementId, StoreProduct } from '../types';

import { ENTITLEMENTS, OFFERING_ID, roleForPackage, selectSdkKey } from './config';

/**
 * RevenueCat (SPEC §31).
 *
 * The only file in the app allowed to import `react-native-purchases` — enforced by ESLint and
 * proven by `src/__tests__/architecture.test.ts`. Everything else talks to `BillingService`.
 *
 * What this service is NOT is the authority on what anybody has paid for. It sells things and
 * reports what the store believes; `user_entitlements` decides what unlocks (SPEC §31). That
 * split is why every purchase here is followed by a server sync before anything opens up.
 *
 * ## Keys
 *
 * Two ways to configure it, and `selectSdkKey` decides which:
 *
 *   * **Test Store** — `EXPO_PUBLIC_REVENUECAT_TEST_KEY`. One key, no platform, no App Store
 *     or Play account. Purchases are simulated but behave like real ones all the way through
 *     the webhook, so the whole chain can be exercised before either store account exists.
 *     Development and preview only; env validation refuses it in production.
 *   * **The real stores** — `EXPO_PUBLIC_REVENUECAT_IOS_KEY` and
 *     `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`, the PUBLIC SDK keys, safe in the bundle (SPEC §56).
 *
 * Either way this is native code, so it needs a development build — Expo Go cannot load it
 * (SPEC §0.1.10).
 */

const asEntitlements = (info: CustomerInfo): CustomerEntitlements => {
  const active = Object.keys(info.entitlements.active).filter(
    (id): id is EntitlementId => id === ENTITLEMENTS.noAds || id === ENTITLEMENTS.premium,
  );

  const isPremium = active.includes('premium');

  return {
    active,
    // Premium grants both, so this is `no_ads OR premium` (SPEC §32).
    isAdFree: isPremium || active.includes('no_ads'),
    isPremium,
  };
};

/**
 * Packages the app knows how to sell.
 *
 * `roleForPackage` returning null means RevenueCat is offering something this build has no
 * copy for — a dashboard changed ahead of a release. Dropping it is better than rendering a
 * card with a missing name and an unknown promise.
 */
const asStoreProducts = (offerings: PurchasesOfferings): StoreProduct[] => {
  const offering = offerings.all[OFFERING_ID] ?? offerings.current;
  if (!offering) return [];

  const products: StoreProduct[] = [];

  for (const item of offering.availablePackages) {
    const role = roleForPackage(item.identifier);
    if (role === null) continue;

    products.push({
      packageId: item.identifier,
      productId: item.product.identifier,
      // Formatted by the store for the customer's country. Never computed, never hardcoded.
      localizedPrice: item.product.priceString,
      priceAmountMicros: Math.round(item.product.price * 1_000_000),
      currencyCode: item.product.currencyCode,
      billingPeriod: item.packageType === 'ANNUAL' ? 'annual' : 'monthly',
      entitlements: role === 'no_ads_monthly' ? ['no_ads'] : ['no_ads', 'premium'],
    });
  }

  return products;
};

let cachedPackages: PurchasesPackage[] = [];

export const RevenueCatBillingService: BillingService = {
  serviceName: 'RevenueCatBillingService',
  isNoop: false,

  async initialize() {
    const env = getEnv();

    const choice = selectSdkKey(
      Platform.OS === 'ios' ? 'ios' : 'android',
      {
        ios: env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
        android: env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
        test: env.EXPO_PUBLIC_REVENUECAT_TEST_KEY,
      },
      isProduction(),
    );

    if (choice.key === null) {
      // Loud, because a silent failure here looks exactly like "nobody wants to subscribe".
      throw new Error(
        `No RevenueCat SDK key for ${Platform.OS}. Set EXPO_PUBLIC_REVENUECAT_${
          Platform.OS === 'ios' ? 'IOS' : 'ANDROID'
        }_KEY, or EXPO_PUBLIC_REVENUECAT_TEST_KEY to use the Test Store.`,
      );
    }

    if (choice.source === 'test-store' && __DEV__) {
      // Said out loud, because a purchase that costs nothing and grants everything is exactly
      // what a broken production build would also look like.
      console.warn('[billing] RevenueCat Test Store — purchases here are simulated.');
    }

    Purchases.configure({ apiKey: choice.key });
  },

  /** Called after authentication, so purchases attach to the Supabase user id (SPEC §12). */
  async identify(userId) {
    await Purchases.logIn(userId);
  },

  async reset() {
    await Purchases.logOut();
  },

  async getOfferings() {
    const offerings = await Purchases.getOfferings();
    const offering = offerings.all[OFFERING_ID] ?? offerings.current;

    // Kept so `purchase` can hand the SDK the object it gave us rather than reconstructing
    // one: RevenueCat matches packages by identity, not by product id.
    cachedPackages = offering?.availablePackages ?? [];

    return asStoreProducts(offerings);
  },

  async purchase(packageId) {
    let target = cachedPackages.find((item) => item.identifier === packageId);

    // Purchasing without having listed first — possible after a cold start straight into the
    // paywall — so fetch rather than fail.
    if (!target) {
      await this.getOfferings();
      target = cachedPackages.find((item) => item.identifier === packageId);
    }

    if (!target) {
      throw new Error(`Package ${packageId} is not in offering ${OFFERING_ID}`);
    }

    // An upgrade from No Ads to Premium is a product CHANGE, not a second subscription. On
    // iOS the subscription group handles it; on Android RevenueCat applies the replacement
    // mode configured in the dashboard (SPEC §5).
    const { customerInfo } = await Purchases.purchasePackage(target);
    return asEntitlements(customerInfo);
  },

  async restorePurchases() {
    return asEntitlements(await Purchases.restorePurchases());
  },

  async getCustomerInfo() {
    return asEntitlements(await Purchases.getCustomerInfo());
  },

  onCustomerInfoChanged(listener) {
    const handler = (info: CustomerInfo) => listener(asEntitlements(info));
    Purchases.addCustomerInfoUpdateListener(handler);
    return () => Purchases.removeCustomerInfoUpdateListener(handler);
  },

  /**
   * Nothing here, deliberately.
   *
   * Asking the server to reconcile is `EntitlementService.refresh()`, which calls the
   * `sync-entitlements` Edge Function. Putting it behind the billing service too would give
   * the codebase two ways to do one thing, and the caller that used the wrong one would be
   * asking the store SDK about a question only the database can answer.
   */
  async refreshEntitlements() {},
};

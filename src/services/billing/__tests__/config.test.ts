import { PACKAGES, PACKAGE_ROLES, roleForPackage, selectSdkKey } from '../config';

/**
 * Billing configuration (SPEC §31, §32, §56).
 *
 * `selectSdkKey` gets the most attention because it is the one rule standing between a
 * released app and simulated purchases. Everything else here guards the product model: three
 * tiers, permanent identifiers, and Premium granting both entitlements.
 */

describe('selectSdkKey', () => {
  const keys = { ios: 'appl_ios', android: 'goog_android', test: 'test_store' };

  it('prefers the Test Store outside production — that is what it is for', () => {
    expect(selectSdkKey('ios', keys, false)).toEqual({ key: 'test_store', source: 'test-store' });
    expect(selectSdkKey('android', keys, false)).toEqual({
      key: 'test_store',
      source: 'test-store',
    });
  });

  /**
   * The assertion that matters. A released build must never take a simulated purchase — it
   * would either charge real money for nothing, or charge none and look broken. Env validation
   * rejects the key before this is reached; this is the second lock.
   */
  it('NEVER uses the Test Store key in production', () => {
    expect(selectSdkKey('ios', keys, true)).toEqual({ key: 'appl_ios', source: 'store' });
    expect(selectSdkKey('android', keys, true)).toEqual({ key: 'goog_android', source: 'store' });
  });

  it('falls back to the platform key when no Test Store key is set', () => {
    expect(selectSdkKey('ios', { ios: 'appl_ios' }, false)).toEqual({
      key: 'appl_ios',
      source: 'store',
    });
  });

  it('picks the key for the platform it is asked about', () => {
    const both = { ios: 'appl_ios', android: 'goog_android' };
    expect(selectSdkKey('android', both, true).key).toBe('goog_android');
  });

  it('reports "missing" rather than guessing', () => {
    // `initialize` turns this into a loud error: a silent failure here looks exactly like
    // "nobody wants to subscribe".
    expect(selectSdkKey('ios', {}, false)).toEqual({ key: null, source: 'missing' });
    expect(selectSdkKey('ios', { android: 'goog_android' }, true)).toEqual({
      key: null,
      source: 'missing',
    });
  });

  it('is missing in production when only a Test Store key was supplied', () => {
    expect(selectSdkKey('ios', { test: 'test_store' }, true)).toEqual({
      key: null,
      source: 'missing',
    });
  });
});

describe('the product model (SPEC §32)', () => {
  it('sells four things: two ways to buy No Ads, two to buy Premium', () => {
    expect(PACKAGE_ROLES).toEqual([
      'no_ads_monthly',
      'no_ads_lifetime',
      'premium_monthly',
      'premium_annual',
    ]);
  });

  it('offers No Ads as a one-off as well as a subscription (D2)', () => {
    expect(PACKAGES.no_ads_lifetime.billingPeriod).toBe('lifetime');
  });

  it('gives Premium products BOTH entitlements', () => {
    // This is why `isAdFree` is `no_ads || premium` everywhere.
    expect(PACKAGES.premium_monthly.entitlements).toEqual(['no_ads', 'premium']);
    expect(PACKAGES.premium_annual.entitlements).toEqual(['no_ads', 'premium']);
  });

  it('gives No Ads only ad removal, however it was bought', () => {
    expect(PACKAGES.no_ads_monthly.entitlements).toEqual(['no_ads']);
    expect(PACKAGES.no_ads_lifetime.entitlements).toEqual(['no_ads']);
  });

  it('uses a distinct product id per role, since store ids are permanent', () => {
    const ids = PACKAGE_ROLES.map((role) => PACKAGES[role].productId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses a distinct package id per role, which is what the app matches on', () => {
    const ids = PACKAGE_ROLES.map((role) => PACKAGES[role].packageId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('recommends exactly one plan', () => {
    expect(PACKAGE_ROLES.filter((role) => PACKAGES[role].recommended)).toEqual(['premium_monthly']);
  });
});

describe('roleForPackage', () => {
  it.each(PACKAGE_ROLES)('resolves %s', (role) => {
    expect(roleForPackage(PACKAGES[role].packageId)).toBe(role);
  });

  it('is null for a package this build does not sell', () => {
    expect(roleForPackage('$rc_weekly_mystery')).toBeNull();
  });
});

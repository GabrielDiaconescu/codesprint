import { NoopAdService, NoopBillingService, NoopConfigService } from '../noop';

/**
 * A no-op must never fake a successful integration (SPEC §59.11, §59.12): anything that
 * would grant access or money has to fail or return empty, never pretend.
 */
describe('no-op services', () => {
  it('never claims ads can be shown before consent is resolved', () => {
    expect(NoopAdService.canShowAds()).toBe(false);
  });

  it('never fabricates a rewarded-ad reward', async () => {
    await expect(NoopAdService.showRewarded('life')).resolves.toBe(false);
  });

  it('rejects a purchase rather than resolving it silently', async () => {
    await expect(NoopBillingService.purchase('premium_monthly')).rejects.toThrow(
      /not implemented yet/,
    );
  });

  it('returns no offerings rather than invented prices', async () => {
    // SPEC §31: never fall back to hardcoded prices — the paywall shows its error state.
    await expect(NoopBillingService.getOfferings()).resolves.toEqual([]);
  });

  it('grants no entitlements', async () => {
    const info = await NoopBillingService.getCustomerInfo();
    expect(info).toEqual({
      active: [],
      isAdFree: false,
      isPremium: false,
      // No customer, so nothing to manage — the Settings button hides itself (SPEC §29).
      managementUrl: null,
    });
  });

  it('serves bundled config defaults so the app boots without a network', () => {
    expect(NoopConfigService.get('free_module_count')).toBe(6);
    // SPEC §50: these two must remain false in V1.
    expect(NoopConfigService.get('offline_mode_enabled')).toBe(false);
    expect(NoopConfigService.get('coding_challenges_enabled')).toBe(false);
  });

  it('marks itself as a no-op so the production guard can see it', () => {
    expect(NoopBillingService.isNoop).toBe(true);
  });
});

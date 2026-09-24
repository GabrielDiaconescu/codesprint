import { compareVersions, isBelowMinimum, parseVersion, storeUrl } from '../appVersion';

/** Retiring old app versions (SPEC §50, §51) — and never locking out a learner by mistake. */
describe('parseVersion', () => {
  it('reads dotted numbers, ignoring pre-release and build labels', () => {
    expect(parseVersion('1.4.2')).toEqual([1, 4, 2]);
    expect(parseVersion(' 2.0 ')).toEqual([2, 0]);
    expect(parseVersion('1.3.0-beta.2')).toEqual([1, 3, 0]);
    expect(parseVersion('1.3.0+45')).toEqual([1, 3, 0]);
  });

  it('refuses anything else', () => {
    expect(parseVersion('latest')).toBeNull();
    expect(parseVersion('1..2')).toBeNull();
    expect(parseVersion('')).toBeNull();
  });
});

describe('compareVersions', () => {
  it('compares numerically, not as text', () => {
    expect(compareVersions([1, 10, 0], [1, 9, 0])).toBeGreaterThan(0);
    expect(compareVersions([1, 2], [1, 2, 0])).toBe(0);
    expect(compareVersions([0, 9], [1])).toBeLessThan(0);
  });
});

describe('isBelowMinimum', () => {
  it('asks an older build to update', () => {
    expect(isBelowMinimum('1.0.0', '1.1.0')).toBe(true);
  });

  it('lets the minimum itself and anything newer through', () => {
    expect(isBelowMinimum('1.1.0', '1.1.0')).toBe(false);
    expect(isBelowMinimum('1.2.0', '1.1.0')).toBe(false);
  });

  it('never locks anyone out on a version it cannot read', () => {
    expect(isBelowMinimum(null, '9.9.9')).toBe(false);
    expect(isBelowMinimum('1.0.0', 'typo')).toBe(false);
  });
});

describe('storeUrl', () => {
  it('points Android at the Play listing', () => {
    expect(
      storeUrl({ platform: 'android', applicationId: 'com.codesprint.app', iosAppStoreId: null }),
    ).toBe('https://play.google.com/store/apps/details?id=com.codesprint.app');
  });

  it('points iOS at the App Store listing once its id is known', () => {
    expect(
      storeUrl({
        platform: 'ios',
        applicationId: 'com.codesprint.app',
        iosAppStoreId: '6450000000',
      }),
    ).toBe('https://apps.apple.com/app/id6450000000');
    expect(
      storeUrl({ platform: 'ios', applicationId: 'com.codesprint.app', iosAppStoreId: null }),
    ).toBeNull();
  });
});

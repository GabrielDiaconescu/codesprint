/**
 * Retiring old app versions (SPEC §50, §51).
 *
 * Old builds stay installed long after a release, and the server has to keep answering them.
 * When a change cannot stay backward compatible, `min_supported_app_version` is raised in
 * `app_config`, and every build below it shows one screen: update. This decides who.
 */

/** `1.4.2` → [1, 4, 2]. Anything after a `-` or `+` (pre-release, build) is ignored. */
export const parseVersion = (value: string): number[] | null => {
  const core = value.trim().split(/[-+]/)[0] ?? '';
  if (!/^\d+(\.\d+)*$/.test(core)) return null;
  return core.split('.').map(Number);
};

/** Negative when a is older than b, positive when newer, 0 when equal. Missing parts are 0. */
export const compareVersions = (a: number[], b: number[]): number => {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const difference = (a[i] ?? 0) - (b[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
};

/**
 * Whether this build is below the minimum.
 *
 * An unknown or unreadable version is NEVER below it: a development build, an emulator without
 * a version, or a typo in `app_config` must not lock every learner out of the app.
 */
export const isBelowMinimum = (current: string | null, minimum: string): boolean => {
  if (!current) return false;
  const have = parseVersion(current);
  const need = parseVersion(minimum);
  if (!have || !need) return false;
  return compareVersions(have, need) < 0;
};

/** Where "Update" goes: the store listing, or null when it is not known yet (iOS, pre-launch). */
export const storeUrl = ({
  platform,
  applicationId,
  iosAppStoreId,
}: {
  platform: 'ios' | 'android' | string;
  applicationId: string | null;
  iosAppStoreId: string | null;
}): string | null => {
  if (platform === 'android' && applicationId) {
    return `https://play.google.com/store/apps/details?id=${encodeURIComponent(applicationId)}`;
  }
  if (platform === 'ios' && iosAppStoreId && /^\d+$/.test(iosAppStoreId)) {
    return `https://apps.apple.com/app/id${iosAppStoreId}`;
  }
  return null;
};

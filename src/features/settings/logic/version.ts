/**
 * The version string a learner reads out to support (SPEC §29).
 *
 * "0.1.0" alone is not enough to identify a build: two TestFlight builds share a version and
 * differ only in build number, and the one thing support needs to know is which of them the
 * person is holding. Where there is no build number — a local development build — the
 * environment says so instead, which is more useful than an empty bracket.
 */
export interface AppBuild {
  version: string | null;
  /** iOS build number or Android versionCode, as the manifest reports it. */
  build: string | number | null;
  environment: string;
}

export const appVersionLabel = ({ version, build, environment }: AppBuild): string => {
  const base = version?.trim() || '—';
  const suffix = build === null || build === '' ? environment : String(build);

  return `${base} (${suffix})`;
};

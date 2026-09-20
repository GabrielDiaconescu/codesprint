import { appVersionLabel } from '../version';

/**
 * The line support asks for (SPEC §29).
 *
 * Two TestFlight builds share a version number and differ only in the build, so a label that
 * drops the build cannot identify which one somebody is holding.
 */
describe('appVersionLabel', () => {
  it('pairs the version with the build number', () => {
    expect(appVersionLabel({ version: '0.1.0', build: 42, environment: 'production' })).toBe(
      '0.1.0 (42)',
    );
  });

  it('accepts a build number as a string, which is how iOS reports it', () => {
    expect(appVersionLabel({ version: '0.1.0', build: '42', environment: 'production' })).toBe(
      '0.1.0 (42)',
    );
  });

  it.each([null, ''] as const)('names the environment when the build is %p', (build) => {
    // A local development build has no build number, and an empty bracket tells nobody
    // anything.
    expect(appVersionLabel({ version: '0.1.0', build, environment: 'development' })).toBe(
      '0.1.0 (development)',
    );
  });

  it('still renders something when the manifest has no version at all', () => {
    expect(appVersionLabel({ version: null, build: null, environment: 'preview' })).toBe(
      '— (preview)',
    );
  });
});

import { exportFileName, legalUrls } from '../legalUrls';

/** The legal pages (SPEC §33, §41) and the export's file name. */
describe('legalUrls', () => {
  it('points at the static pages under the base URL', () => {
    expect(legalUrls('https://codesprint.example')).toEqual({
      privacy: 'https://codesprint.example/privacy.html',
      terms: 'https://codesprint.example/terms.html',
      support: 'https://codesprint.example/',
      deleteAccount: 'https://codesprint.example/delete-account.html',
      licenses: 'https://codesprint.example/licenses.html',
    });
  });

  it('does not double a trailing slash', () => {
    expect(legalUrls('https://codesprint.example/')?.terms).toBe(
      'https://codesprint.example/terms.html',
    );
  });

  it('offers no links at all without a base — never "undefined/terms.html"', () => {
    expect(legalUrls(undefined)).toBeNull();
    expect(legalUrls('  ')).toBeNull();
  });

  it('sends a learner using the app in Romanian to the Romanian pages', () => {
    expect(legalUrls('https://codesprint.example', 'ro')).toEqual({
      privacy: 'https://codesprint.example/ro/privacy.html',
      terms: 'https://codesprint.example/ro/terms.html',
      support: 'https://codesprint.example/ro/',
      deleteAccount: 'https://codesprint.example/ro/delete-account.html',
      // Generated in English only.
      licenses: 'https://codesprint.example/licenses.html',
    });
    expect(legalUrls('https://codesprint.example', 'en-US')?.terms).toBe(
      'https://codesprint.example/terms.html',
    );
  });
});

describe('exportFileName', () => {
  it('is dated in the local calendar', () => {
    expect(exportFileName(new Date(2026, 8, 4, 23, 30))).toBe('codesprint-data-2026-09-04.json');
  });
});

import { exportFileName, legalUrls } from '../legalUrls';

/** The legal pages (SPEC §33, §41) and the export's file name. */
describe('legalUrls', () => {
  it('points at the static pages under the base URL', () => {
    expect(legalUrls('https://codesprint.example')).toEqual({
      privacy: 'https://codesprint.example/privacy.html',
      terms: 'https://codesprint.example/terms.html',
      support: 'https://codesprint.example/',
      deleteAccount: 'https://codesprint.example/delete-account.html',
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
});

describe('exportFileName', () => {
  it('is dated in the local calendar', () => {
    expect(exportFileName(new Date(2026, 8, 4, 23, 30))).toBe('codesprint-data-2026-09-04.json');
  });
});

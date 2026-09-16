import { BRAND } from '../brand';

/**
 * SPEC §9: the brand lives in exactly one place so a rename is a one-line change.
 * Name clearance is still a launch blocker (SPEC §0.3).
 */
describe('BRAND', () => {
  it('exports non-empty values for every brand surface', () => {
    for (const [key, value] of Object.entries(BRAND)) {
      expect(typeof value).toBe('string');
      // Key is interpolated into the assertion so a failure names the offending field.
      expect({ key, empty: value.trim().length === 0 }).toEqual({ key, empty: false });
    }
  });

  it('uses the brand name inside the store title, so the two cannot drift apart', () => {
    expect(BRAND.storeTitle).toContain(BRAND.name);
  });
});

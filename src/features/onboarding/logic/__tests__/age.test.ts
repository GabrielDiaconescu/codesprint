import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DEFAULT_APP_CONFIG } from '@/services/config/defaults';

import { ageFromBirthYear, classifyAge, validateBirthYear } from '../age';

/** Pinned so the suite cannot start failing in January. */
const NOW = new Date('2026-06-15T12:00:00Z');

const THRESHOLDS = { minUserAge: 13, minorProtectionAge: 16 };

describe('ageFromBirthYear', () => {
  it.each([
    [1996, 30],
    [2013, 13],
    [2014, 12],
    [2026, 0],
  ])('birth year %i gives age %i', (birthYear, expected) => {
    expect(ageFromBirthYear(birthYear, NOW)).toBe(expected);
  });

  it('is the age reached during the year, not the age on the day', () => {
    // SPEC §11 collects the year only, so someone born in December 2013 counts as 13 from
    // January. The database resolves it identically; the two must not disagree.
    expect(ageFromBirthYear(2013, new Date('2026-01-01T00:00:00Z'))).toBe(13);
  });
});

describe('validateBirthYear', () => {
  it.each(['1996', '2013', ' 2005 '])('accepts %p', (input) => {
    expect(validateBirthYear(input, NOW)).toBeNull();
  });

  it('accepts a year that makes the user too young', () => {
    // The input is valid; the person is under age. Those are different problems, and
    // conflating them would phrase being twelve as a typing mistake.
    expect(validateBirthYear('2020', NOW)).toBeNull();
  });

  it.each([
    ['', 'required'],
    ['   ', 'required'],
    ['96', 'not-a-year'],
    ['19966', 'not-a-year'],
    ['2O05', 'not-a-year'],
    ['-1996', 'not-a-year'],
    ['19.6', 'not-a-year'],
    ['2027', 'in-the-future'],
    ['1800', 'implausible'],
  ])('rejects %p as %s', (input, expected) => {
    expect(validateBirthYear(input, NOW)).toBe(expected);
  });

  it('accepts the current year rather than calling it the future', () => {
    expect(validateBirthYear('2026', NOW)).toBeNull();
  });
});

describe('classifyAge', () => {
  it.each([
    [1996, 'adult'],
    [2010, 'adult'],
    [2011, 'protected-minor'],
    [2013, 'protected-minor'],
    [2014, 'too-young'],
    [2020, 'too-young'],
  ])('birth year %i is %s', (birthYear, expected) => {
    expect(classifyAge(birthYear, THRESHOLDS, NOW)).toBe(expected);
  });

  describe('the boundaries', () => {
    it('admits someone who turns exactly the minimum age this year', () => {
      expect(classifyAge(2013, THRESHOLDS, NOW)).not.toBe('too-young');
    });

    it('refuses someone one year younger', () => {
      expect(classifyAge(2014, THRESHOLDS, NOW)).toBe('too-young');
    });

    it('stops protecting at exactly the protection age', () => {
      expect(classifyAge(2010, THRESHOLDS, NOW)).toBe('adult');
    });

    it('still protects one year below it', () => {
      expect(classifyAge(2011, THRESHOLDS, NOW)).toBe('protected-minor');
    });
  });

  it('follows the configured thresholds rather than hardcoded ones', () => {
    // The thresholds live in app_config so they can be raised per market without a release.
    const strict = { minUserAge: 16, minorProtectionAge: 18 };
    expect(classifyAge(2013, strict, NOW)).toBe('too-young');
    expect(classifyAge(2009, strict, NOW)).toBe('protected-minor');
  });
});

/**
 * The client thresholds are a copy of the seeded server values, so the same birth year must
 * not be "adult" on one side and "minor" on the other. Drift would mean the app shows an
 * analytics toggle the database then silently overrides.
 */
describe('agreement with the seeded app_config', () => {
  const migration = readFileSync(
    join(__dirname, '../../../../../supabase/migrations/20260917120700_onboarding.sql'),
    'utf8',
  );

  it.each([
    ['min_user_age', DEFAULT_APP_CONFIG.min_user_age],
    ['minor_protection_age', DEFAULT_APP_CONFIG.minor_protection_age],
  ])('seeds %s to the bundled default', (key, expected) => {
    const match = new RegExp(`\\('${key}', '(\\d+)'::jsonb`).exec(migration);
    expect(match?.[1]).toBe(String(expected));
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DEFAULT_APP_CONFIG } from '@/services/config/defaults';

import { getLevel, getLevelProgress, percent } from '../levels';

/**
 * The level curve (SPEC §20).
 *
 * It exists in exactly one place — here — because the server deliberately stores only XP.
 * That makes these tests the only thing standing between a learner and a level number that
 * disagrees with their XP.
 */
const THRESHOLDS = DEFAULT_APP_CONFIG.level_thresholds;

describe('getLevel', () => {
  it.each([
    [0, 1],
    [99, 1],
    [100, 2],
    [249, 2],
    [250, 3],
    [4100, 10],
    [18100, 20],
  ])('%i XP is level %i', (xp, expected) => {
    expect(getLevel(xp, THRESHOLDS)).toBe(expected);
  });

  it('starts everyone at level 1, never level 0', () => {
    expect(getLevel(0, THRESHOLDS)).toBe(1);
  });

  it('levels up exactly ON the threshold, not one XP later', () => {
    // Off-by-one here means a learner sees "100/100 XP" and stays at level 1.
    expect(getLevel(99, THRESHOLDS)).toBe(1);
    expect(getLevel(100, THRESHOLDS)).toBe(2);
  });

  it('keeps levelling past the last configured threshold', () => {
    // SPEC §20: "then increments grow by ~100 per level". A learner who passes the configured
    // curve must not sit at a permanent maximum.
    expect(getLevel(30_000, THRESHOLDS)).toBeGreaterThan(20);
    expect(getLevel(100_000, THRESHOLDS)).toBeGreaterThan(getLevel(30_000, THRESHOLDS));
  });

  it('never goes backwards as XP grows', () => {
    let previous = 0;
    for (let xp = 0; xp <= 40_000; xp += 137) {
      const level = getLevel(xp, THRESHOLDS);
      expect(level).toBeGreaterThanOrEqual(previous);
      previous = level;
    }
  });

  it.each([
    ['negative XP', -50],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('survives %s', (_label, xp) => {
    expect(getLevel(xp, THRESHOLDS)).toBeGreaterThanOrEqual(1);
  });

  describe('malformed thresholds', () => {
    it('sorts an unordered list', () => {
      expect(getLevel(150, [250, 0, 100])).toBe(2);
    });

    it('inserts a missing zero rather than starting below level 1', () => {
      expect(getLevel(0, [100, 250])).toBe(1);
      expect(getLevel(100, [100, 250])).toBe(2);
    });

    it('copes with a single threshold', () => {
      expect(getLevel(0, [0])).toBe(1);
      expect(getLevel(1000, [0])).toBeGreaterThan(1);
    });
  });
});

describe('getLevelProgress', () => {
  it('reports the span of the current level', () => {
    const progress = getLevelProgress(150, THRESHOLDS);
    expect(progress).toMatchObject({
      level: 2,
      levelStartXp: 100,
      nextLevelXp: 250,
      xpIntoLevel: 50,
      xpForNextLevel: 150,
    });
  });

  it('is 0 exactly at the start of a level', () => {
    expect(getLevelProgress(100, THRESHOLDS).progress).toBe(0);
  });

  it('approaches but never reaches 1 within a level', () => {
    const progress = getLevelProgress(249, THRESHOLDS).progress;
    expect(progress).toBeGreaterThan(0.9);
    expect(progress).toBeLessThan(1);
  });

  it('never exceeds 1', () => {
    for (const xp of [0, 1, 99, 100, 4100, 18100, 50_000]) {
      const { progress } = getLevelProgress(xp, THRESHOLDS);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    }
  });

  it('agrees with getLevel at every point', () => {
    for (let xp = 0; xp <= 25_000; xp += 311) {
      expect(getLevelProgress(xp, THRESHOLDS).level).toBe(getLevel(xp, THRESHOLDS));
    }
  });

  it('never divides by zero, even with duplicate thresholds', () => {
    const { progress, xpForNextLevel } = getLevelProgress(100, [0, 100, 100, 250]);
    expect(Number.isFinite(progress)).toBe(true);
    expect(xpForNextLevel).toBeGreaterThan(0);
  });
});

describe('percent', () => {
  it.each([
    [3, 4, 75],
    [0, 4, 0],
    [4, 4, 100],
    [1, 3, 33],
  ])('%i of %i is %i%%', (value, total, expected) => {
    expect(percent(value, total)).toBe(expected);
  });

  it.each([
    ['a zero total', 0, 0],
    ['a negative total', 5, -1],
  ])('returns 0 for %s', (_label, value, total) => {
    expect(percent(value, total)).toBe(0);
  });

  it('clamps above 100', () => {
    expect(percent(9, 4)).toBe(100);
  });

  it('survives NaN', () => {
    expect(percent(Number.NaN, 4)).toBe(0);
  });
});

/**
 * The bundled defaults are a copy of the seeded server values. Drift would mean the app shows
 * a different level from the one every server-side rule assumes.
 */
describe('agreement with the seeded app_config', () => {
  it('uses the same level thresholds as the database', () => {
    const migration = readFileSync(
      join(__dirname, '../../../../../supabase/migrations/20260917120300_app_config.sql'),
      'utf8',
    );
    const match = /\('level_thresholds',\s*'(\[[^\]]*\])'::jsonb/.exec(migration);
    expect(match).not.toBeNull();
    expect(JSON.parse(match![1]!)).toEqual(THRESHOLDS);
  });
});

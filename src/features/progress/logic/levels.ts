/**
 * The level system (SPEC §20).
 *
 * Level is a DERIVED display value: the server stores XP and nothing else, and every
 * server-side rule keys on XP rather than on a level, so this logic exists in exactly one
 * place and cannot drift between client and database.
 *
 * Thresholds come from `app_config.level_thresholds` — cumulative XP where index 0 is the
 * entry point of level 1. They are configuration so the curve can be tuned after launch
 * without a release.
 */

/** The step between the last two configured thresholds grows by this much per level (SPEC §20). */
const EXTRAPOLATION_GROWTH = 100;

export interface LevelProgress {
  level: number;
  /** XP at which the current level began. */
  levelStartXp: number;
  /** XP at which the next level begins. */
  nextLevelXp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  /** 0–1 through the current level. */
  progress: number;
}

/**
 * Thresholds beyond the configured list.
 *
 * The seeded array ends at level 20. A learner who passes it must keep levelling rather than
 * sitting at a permanent maximum, so the curve continues: the final configured step, growing
 * by `EXTRAPOLATION_GROWTH` each level.
 */
const thresholdAt = (thresholds: number[], index: number): number => {
  if (index < thresholds.length) return thresholds[index]!;
  if (thresholds.length < 2) return (thresholds[0] ?? 0) + EXTRAPOLATION_GROWTH * (index + 1);

  const last = thresholds[thresholds.length - 1]!;
  const previous = thresholds[thresholds.length - 2]!;
  const baseStep = last - previous;
  const stepsBeyond = index - (thresholds.length - 1);

  // Sum of an arithmetic series: baseStep + growth, baseStep + 2*growth, ...
  return (
    last + stepsBeyond * baseStep + EXTRAPOLATION_GROWTH * ((stepsBeyond * (stepsBeyond + 1)) / 2)
  );
};

/** Sanitises whatever config supplied: sorted, finite, non-negative, starting at 0. */
const normalise = (thresholds: readonly number[]): number[] => {
  const cleaned = thresholds
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b);

  // Level 1 must start somewhere; without a zero every learner would begin below level 1.
  return cleaned[0] === 0 ? cleaned : [0, ...cleaned];
};

export const getLevel = (xp: number, thresholds: readonly number[]): number => {
  const list = normalise(thresholds);
  const safeXp = Number.isFinite(xp) && xp > 0 ? xp : 0;

  let level = 1;
  // Walk forward rather than searching the array, because the curve continues past its end.
  while (safeXp >= thresholdAt(list, level)) {
    level += 1;
    // A pathological threshold list must not spin forever.
    if (level > 1000) break;
  }
  return level;
};

export const getLevelProgress = (xp: number, thresholds: readonly number[]): LevelProgress => {
  const list = normalise(thresholds);
  const safeXp = Number.isFinite(xp) && xp > 0 ? xp : 0;
  const level = getLevel(safeXp, list);

  const levelStartXp = thresholdAt(list, level - 1);
  const nextLevelXp = thresholdAt(list, level);
  const xpForNextLevel = Math.max(1, nextLevelXp - levelStartXp);
  const xpIntoLevel = Math.max(0, safeXp - levelStartXp);

  return {
    level,
    levelStartXp,
    nextLevelXp,
    xpIntoLevel,
    xpForNextLevel,
    progress: Math.min(1, xpIntoLevel / xpForNextLevel),
  };
};

/** Percentage, clamped and rounded — for a progress bar label. */
export const percent = (value: number, total: number): number => {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
};

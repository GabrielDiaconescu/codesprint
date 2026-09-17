/**
 * Deterministic shuffling for ordering and matching questions (SPEC §16).
 *
 * Authors write `code_ordering` lines and `concept_matching` definitions in their natural
 * order — which is usually the answer. Presenting them as authored would give the answer
 * away, so they are shuffled. But a shuffle that changed on every render would reorder the
 * lines under the learner's finger, so it is seeded by the question id: the same question
 * always shuffles the same way, on every device and every open.
 */

/** A small, well-distributed 32-bit hash (FNV-1a) of a string. */
const hash = (input: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/** mulberry32: tiny, fast, and adequate for reordering a handful of items. */
const random = (seed: number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Fisher–Yates with a seeded generator.
 *
 * If the result happens to equal the input order — likely for three items — it is rotated
 * by one, so a shuffle never quietly presents the authored order. It cannot know the ANSWER
 * order (the client never does), but the authored order is the one worth avoiding.
 */
export const seededShuffle = <T>(items: readonly T[], seed: string): T[] => {
  const result = [...items];
  if (result.length < 2) return result;

  const next = random(hash(seed));
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }

  const unchanged = result.every((item, index) => item === items[index]);
  if (unchanged) {
    result.push(result.shift()!);
  }

  return result;
};

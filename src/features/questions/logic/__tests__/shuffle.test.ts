import { seededShuffle } from '../shuffle';

describe('seededShuffle', () => {
  const items = ['one', 'two', 'three', 'four'];

  it('returns the same order for the same seed, every time', () => {
    // The lines must not move under the learner's finger on re-render.
    expect(seededShuffle(items, 'question-a')).toEqual(seededShuffle(items, 'question-a'));
  });

  it('returns a different order for a different seed', () => {
    const seeds = ['a', 'b', 'c', 'd', 'e', 'f'];
    const orders = new Set(seeds.map((seed) => seededShuffle(items, seed).join('|')));
    expect(orders.size).toBeGreaterThan(1);
  });

  it('is a permutation: nothing lost, nothing duplicated', () => {
    const result = seededShuffle(items, 'seed');
    expect([...result].sort()).toEqual([...items].sort());
  });

  it('never returns the authored order', () => {
    // The authored order is usually the answer. Across many seeds, none may pass it through.
    for (let i = 0; i < 200; i += 1) {
      expect(seededShuffle(['a', 'b', 'c'], `seed-${i}`)).not.toEqual(['a', 'b', 'c']);
    }
  });

  it('does not mutate its input', () => {
    const original = [...items];
    seededShuffle(items, 'seed');
    expect(items).toEqual(original);
  });

  it.each([[[]], [['only']]])('leaves %p alone', (input) => {
    expect(seededShuffle(input, 'seed')).toEqual(input);
  });

  it('works on objects by reference', () => {
    const lines = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const result = seededShuffle(lines, 'q');
    expect(result).toHaveLength(3);
    expect(result.every((line) => lines.includes(line))).toBe(true);
  });
});

import type { Leaderboard, LeaderboardRow } from '@/services';

import { absenceReason, buildLeaderboardRows } from '../rows';

const row = (rank: number, name: string, xp: number): LeaderboardRow => ({
  rank,
  user_id: `u-${rank}`,
  display_name: name,
  avatar_key: 'default',
  xp,
});

const board = (patch: Partial<Leaderboard> = {}): Leaderboard => ({
  week_start: '2026-09-14',
  total_ranked: 3,
  top: [row(1, 'Ada', 300), row(2, 'Grace', 200), row(3, 'Alan', 100)],
  me: row(2, 'Grace', 200),
  neighbours: [],
  eligible: true,
  has_display_name: true,
  hidden: false,
  is_guest: false,
  ...patch,
});

describe('buildLeaderboardRows', () => {
  it('lists the top rows in order', () => {
    const items = buildLeaderboardRows(board());
    expect(items.map((item) => item.key)).toEqual(['u-1', 'u-2', 'u-3']);
  });

  it('marks the caller so their own row can be highlighted', () => {
    const items = buildLeaderboardRows(board());
    expect(items.filter((item) => item.kind === 'row' && item.isMe)).toHaveLength(1);
  });

  it('marks nobody when the caller has no row this week', () => {
    const items = buildLeaderboardRows(board({ me: null }));
    expect(items.some((item) => item.kind === 'row' && item.isMe)).toBe(false);
  });

  it('puts a gap between the top and a distant caller', () => {
    const items = buildLeaderboardRows(
      board({
        me: row(57, 'Grace', 40),
        neighbours: [row(56, 'Blaise', 45), row(57, 'Grace', 40), row(58, 'Kurt', 35)],
      }),
    );

    const gap = items.find((item) => item.kind === 'gap');
    // Ranks 4 to 55 are not on screen, and the list says so rather than implying 3 is next
    // to 56.
    expect(gap).toEqual({ kind: 'gap', key: 'gap', skipped: 52 });
    expect(items).toHaveLength(7);
  });

  it('adds no gap when the neighbours continue straight on from the top', () => {
    const items = buildLeaderboardRows(
      board({ me: row(4, 'Blaise', 90), neighbours: [row(4, 'Blaise', 90)] }),
    );
    expect(items.some((item) => item.kind === 'gap')).toBe(false);
  });

  it('never renders the same learner twice', () => {
    // The server excludes the top slice from the neighbours; a list that could still double
    // up would be one config change away from doing it.
    const items = buildLeaderboardRows(board({ neighbours: [row(3, 'Alan', 100)] }));
    expect(items).toHaveLength(3);
  });

  it('handles an empty board', () => {
    expect(buildLeaderboardRows(board({ top: [], me: null, total_ranked: 0 }))).toEqual([]);
  });
});

describe('absenceReason', () => {
  it('is null for somebody who is on the board', () => {
    expect(absenceReason(board())).toBeNull();
  });

  it('reports a guest before anything else', () => {
    // A guest has no name either, but "create an account" is the fix, not "choose a name".
    expect(absenceReason(board({ is_guest: true, has_display_name: false, eligible: false }))).toBe(
      'guest',
    );
  });

  it('reports a missing display name', () => {
    expect(absenceReason(board({ has_display_name: false, eligible: false, me: null }))).toBe(
      'no-name',
    );
  });

  it('reports being hidden', () => {
    expect(absenceReason(board({ hidden: true, eligible: false, me: null }))).toBe('hidden');
  });

  it('falls back to "no XP yet" for somebody eligible who simply has not earned any', () => {
    expect(absenceReason(board({ me: null }))).toBe('no-xp');
  });
});

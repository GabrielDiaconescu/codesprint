import { leaderboard, leaderboardRow } from '../schema';

/**
 * The leaderboard payload (SPEC §26).
 *
 * The assertions that matter are the ones proving a field nobody meant to send would be
 * REJECTED. This is the only response in the product carrying other people's data, and a
 * strict schema is what turns a future server mistake into a loud parse error instead of a
 * quiet privacy leak.
 */

const row = {
  rank: 1,
  user_id: 'u-1',
  display_name: 'Ada Lovelace',
  avatar_key: 'default',
  xp: 1240,
};

const board = {
  week_start: '2026-09-14',
  total_ranked: 1,
  top: [row],
  me: row,
  neighbours: [],
  eligible: true,
  has_display_name: true,
  hidden: false,
  is_guest: false,
};

describe('leaderboardRow', () => {
  it('accepts a ranked row', () => {
    expect(leaderboardRow.parse(row).display_name).toBe('Ada Lovelace');
  });

  it('rejects a row carrying an email address', () => {
    expect(leaderboardRow.safeParse({ ...row, email: 'ada@example.com' }).success).toBe(false);
  });

  it('rejects a row carrying anything else that was not asked for', () => {
    expect(leaderboardRow.safeParse({ ...row, birth_year: 1815 }).success).toBe(false);
  });

  it('rejects a rank of zero — ranks start at one', () => {
    expect(leaderboardRow.safeParse({ ...row, rank: 0 }).success).toBe(false);
  });
});

describe('leaderboard', () => {
  it('accepts a full board', () => {
    expect(leaderboard.parse(board).top).toHaveLength(1);
  });

  it('accepts an empty board at the start of a week', () => {
    const empty = leaderboard.parse({
      ...board,
      total_ranked: 0,
      top: [],
      me: null,
    });
    expect(empty.me).toBeNull();
  });

  it('accepts a caller who is absent for each of the three reasons', () => {
    expect(
      leaderboard.parse({ ...board, me: null, eligible: false, is_guest: true }).is_guest,
    ).toBe(true);
    expect(
      leaderboard.parse({ ...board, me: null, eligible: false, has_display_name: false })
        .has_display_name,
    ).toBe(false);
    expect(leaderboard.parse({ ...board, me: null, eligible: false, hidden: true }).hidden).toBe(
      true,
    );
  });

  it('rejects an unexpected top-level field rather than passing it through', () => {
    expect(leaderboard.safeParse({ ...board, emails: ['ada@example.com'] }).success).toBe(false);
  });

  it('rejects a neighbour carrying an explanation of who they are', () => {
    expect(
      leaderboard.safeParse({ ...board, neighbours: [{ ...row, email: 'x@y.z' }] }).success,
    ).toBe(false);
  });
});

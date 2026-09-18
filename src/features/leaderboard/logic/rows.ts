import type { Leaderboard, LeaderboardRow } from '@/services';

/**
 * Flattening the ranking into one list the screen can render (SPEC §26).
 *
 * The server sends two slices — the top of the table, and the ±5 around the caller — which
 * are usually far apart. A single list with an explicit gap marker between them is what a
 * reader expects, and it keeps the screen free of the "which array am I in" arithmetic.
 *
 * Pure, so the interesting cases (nobody ranked, caller inside the top, caller far below,
 * caller absent) are unit tests rather than a device hunt.
 */

export type LeaderboardItem =
  | { kind: 'row'; key: string; row: LeaderboardRow; isMe: boolean }
  | { kind: 'gap'; key: string; skipped: number };

export const buildLeaderboardRows = (board: Leaderboard): LeaderboardItem[] => {
  const meId = board.me?.user_id ?? null;
  const seen = new Set<string>();
  const items: LeaderboardItem[] = [];

  const push = (row: LeaderboardRow) => {
    // The server already excludes the top slice from the neighbours, but a list that can
    // render the same person twice is a bug waiting for a config change.
    if (seen.has(row.user_id)) return;
    seen.add(row.user_id);
    items.push({ kind: 'row', key: row.user_id, row, isMe: row.user_id === meId });
  };

  for (const row of board.top) push(row);

  const firstNeighbour = board.neighbours[0];
  if (firstNeighbour) {
    const lastTop = board.top[board.top.length - 1];
    const skipped = lastTop ? firstNeighbour.rank - lastTop.rank - 1 : 0;
    if (skipped > 0) items.push({ kind: 'gap', key: 'gap', skipped });

    for (const row of board.neighbours) push(row);
  }

  return items;
};

/**
 * Why the caller is not on the board, or null when they are.
 *
 * Four states, four different fixes — and "you have not earned any XP yet" is the only one
 * that is not a setting. Collapsing them into one empty state would leave a learner who hid
 * themselves months ago with no idea why they are missing.
 */
export type AbsenceReason = 'guest' | 'no-name' | 'hidden' | 'no-xp' | null;

export const absenceReason = (board: Leaderboard): AbsenceReason => {
  if (board.is_guest) return 'guest';
  if (!board.has_display_name) return 'no-name';
  if (board.hidden) return 'hidden';
  if (board.me === null) return 'no-xp';
  return null;
};

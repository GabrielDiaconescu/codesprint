import { screen } from '@testing-library/react-native';

import type { LeaderboardRow } from '@/services';
import { renderWithTheme } from '@/test-utils';

import { LeaderboardRowItem } from '../LeaderboardRowItem';

const row = (overrides: Partial<LeaderboardRow> = {}): LeaderboardRow => ({
  rank: 3,
  user_id: 'u-3',
  display_name: 'Ada Lovelace',
  avatar_key: 'default',
  xp: 1240,
  ...overrides,
});

describe('LeaderboardRowItem', () => {
  it('shows the rank, the name and the score', async () => {
    await renderWithTheme(<LeaderboardRowItem row={row()} isMe={false} />);

    expect(screen.getByText('Ada Lovelace')).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
    expect(screen.getByText('1,240 XP')).toBeOnTheScreen();
  });

  /**
   * One element, one label. A row split into four separate announcements is four swipes to
   * read one line of a list (SPEC §47).
   */
  it('reads as a single line to a screen reader', async () => {
    await renderWithTheme(<LeaderboardRowItem row={row()} isMe={false} />);

    expect(screen.getByTestId('leaderboard-row-3')).toHaveProp(
      'accessibilityLabel',
      'Rank 3, Ada Lovelace, 1,240 XP',
    );
  });

  /** The caller's own row is drawn differently — and SAID differently, not just coloured. */
  it('announces the caller as themselves', async () => {
    await renderWithTheme(<LeaderboardRowItem row={row()} isMe />);

    expect(screen.getByTestId('leaderboard-row-3')).toHaveProp(
      'accessibilityLabel',
      'Rank 3, Ada Lovelace, 1,240 XP. This is you.',
    );
    expect(screen.getByText('You')).toBeOnTheScreen();
  });

  it('offers a report control for another learner', async () => {
    await renderWithTheme(<LeaderboardRowItem row={row()} isMe={false} onReport={jest.fn()} />);

    expect(screen.getByTestId('leaderboard-report-3')).toHaveProp(
      'accessibilityLabel',
      'Report Ada Lovelace',
    );
  });

  it('offers none on the caller’s own row', async () => {
    // The server refuses a self-report anyway; showing the control would be an invitation to
    // an error message.
    await renderWithTheme(<LeaderboardRowItem row={row()} isMe />);

    expect(screen.queryByTestId('leaderboard-report-3')).toBeNull();
  });
});

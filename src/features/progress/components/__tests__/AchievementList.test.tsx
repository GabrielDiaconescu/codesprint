import { screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test-utils';
import type { AchievementEntry } from '@/services';

import { AchievementList } from '../AchievementList';

const entry = (overrides: Partial<AchievementEntry>): AchievementEntry => ({
  id: 'a-1',
  slug: 'first-lesson',
  name: 'First Lesson',
  description: 'You finished your first lesson.',
  icon_key: 'footsteps',
  xp_reward: 10,
  sort_order: 10,
  unlocked_at: null,
  ...overrides,
});

describe('AchievementList', () => {
  it('shows locked achievements, so there is something to aim at', async () => {
    await renderWithTheme(<AchievementList achievements={[entry({})]} />);

    expect(screen.getByText('First Lesson')).toBeOnTheScreen();
    expect(screen.getByText('You finished your first lesson.')).toBeOnTheScreen();
  });

  /**
   * Locked and unlocked differ by more than opacity: the state is spoken. A dimmed card tells
   * a screen-reader user nothing at all (SPEC §47).
   */
  it('names an unlocked achievement as unlocked', async () => {
    await renderWithTheme(
      <AchievementList achievements={[entry({ unlocked_at: '2026-09-18T10:00:00Z' })]} />,
    );

    expect(screen.getByTestId('achievement-row-first-lesson')).toHaveProp(
      'accessibilityLabel',
      'First Lesson. You finished your first lesson. Unlocked.',
    );
  });

  it('names a locked achievement as locked', async () => {
    await renderWithTheme(<AchievementList achievements={[entry({})]} />);

    expect(screen.getByTestId('achievement-row-first-lesson')).toHaveProp(
      'accessibilityLabel',
      'First Lesson. You finished your first lesson. Locked.',
    );
  });

  it('shows the XP reward', async () => {
    await renderWithTheme(<AchievementList achievements={[entry({ xp_reward: 25 })]} />);

    expect(screen.getByText('+25')).toBeOnTheScreen();
  });

  it('omits the reward when there is none', async () => {
    await renderWithTheme(<AchievementList achievements={[entry({ xp_reward: 0 })]} />);

    expect(screen.queryByText('+0')).toBeNull();
  });

  it('renders every achievement it is given', async () => {
    await renderWithTheme(
      <AchievementList
        achievements={[
          entry({ id: 'a', slug: 'first-lesson' }),
          entry({ id: 'b', slug: 'streak-3', name: 'Three Day Streak' }),
          entry({ id: 'c', slug: 'perfect-lesson', name: 'Perfect Lesson' }),
        ]}
      />,
    );

    expect(screen.getByTestId('achievement-row-first-lesson')).toBeOnTheScreen();
    expect(screen.getByTestId('achievement-row-streak-3')).toBeOnTheScreen();
    expect(screen.getByTestId('achievement-row-perfect-lesson')).toBeOnTheScreen();
  });

  it('renders nothing for an empty catalogue without crashing', async () => {
    await renderWithTheme(<AchievementList achievements={[]} />);

    expect(screen.queryByText('First Lesson')).toBeNull();
  });
});

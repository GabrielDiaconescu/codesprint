import { screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test-utils';

import { LivesIndicator } from '../LivesIndicator';

/**
 * Counting five heart icons by ear is no way to learn you are nearly out, so the whole row
 * carries one spoken label. These tests pin that label, because it is the part a sighted
 * reviewer will never notice is broken (SPEC §47).
 */
describe('LivesIndicator', () => {
  it('announces the count in words', async () => {
    await renderWithTheme(<LivesIndicator lives={3} max={5} unlimited={false} />);

    expect(screen.getByLabelText('3 lives of 5')).toBeOnTheScreen();
  });

  it('uses the singular for one life', async () => {
    await renderWithTheme(<LivesIndicator lives={1} max={5} unlimited={false} />);

    expect(screen.getByLabelText('1 life of 5')).toBeOnTheScreen();
  });

  it('announces none left', async () => {
    await renderWithTheme(<LivesIndicator lives={0} max={5} unlimited={false} />);

    expect(screen.getByLabelText('0 lives of 5')).toBeOnTheScreen();
  });

  it('says unlimited for a premium user rather than drawing five hearts', async () => {
    await renderWithTheme(<LivesIndicator lives={5} max={5} unlimited />);

    expect(screen.getByLabelText('Unlimited lives')).toBeOnTheScreen();
  });

  describe('the countdown', () => {
    const inMinutes = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

    it('shows minutes when the next life is close', async () => {
      await renderWithTheme(
        <LivesIndicator lives={2} max={5} unlimited={false} nextLifeAt={inMinutes(25)} />,
      );

      expect(screen.getByText(/in 2[45] minutes/)).toBeOnTheScreen();
    });

    it('shows hours when it is further away', async () => {
      await renderWithTheme(
        <LivesIndicator lives={2} max={5} unlimited={false} nextLifeAt={inMinutes(185)} />,
      );

      expect(screen.getByText('in 3 hours')).toBeOnTheScreen();
    });

    it('never shows a negative or zero countdown from a stale timestamp', async () => {
      // The timestamp comes from the server and the device clock may be behind it.
      await renderWithTheme(
        <LivesIndicator lives={2} max={5} unlimited={false} nextLifeAt={inMinutes(-90)} />,
      );

      expect(screen.getByText('in 1 minute')).toBeOnTheScreen();
    });

    it('hides the countdown when lives are full', async () => {
      await renderWithTheme(
        <LivesIndicator lives={5} max={5} unlimited={false} nextLifeAt={inMinutes(30)} />,
      );

      expect(screen.queryByText(/^in /)).toBeNull();
    });

    it('shows no countdown when the server sent none', async () => {
      await renderWithTheme(
        <LivesIndicator lives={2} max={5} unlimited={false} nextLifeAt={null} />,
      );

      expect(screen.queryByText(/^in /)).toBeNull();
    });
  });
});

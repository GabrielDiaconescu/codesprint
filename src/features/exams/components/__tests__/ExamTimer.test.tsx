import { act, screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test-utils';

import { ExamTimer } from '../ExamTimer';

/**
 * The countdown (SPEC §27, §47).
 *
 * Fake timers throughout: an exam clock tested against the real one is a test that takes
 * 45 minutes or passes by accident.
 */

const NOW = Date.parse('2026-09-18T12:00:00Z');

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

const at = (minutes: number) => new Date(NOW + minutes * 60_000).toISOString();

describe('ExamTimer', () => {
  it('shows the time left', async () => {
    await renderWithTheme(<ExamTimer expiresAt={at(45)} onExpired={jest.fn()} />);

    expect(screen.getByText('45:00')).toBeOnTheScreen();
  });

  it('says so when there is no time limit, rather than showing a dash', async () => {
    await renderWithTheme(<ExamTimer expiresAt={null} onExpired={jest.fn()} />);

    expect(screen.getByText('No time limit')).toBeOnTheScreen();
    expect(screen.queryByTestId('exam-timer')).toBeNull();
  });

  it('announces the remaining time rather than a bare clock reading', async () => {
    await renderWithTheme(<ExamTimer expiresAt={at(10)} onExpired={jest.fn()} />);

    expect(screen.getByTestId('exam-timer')).toHaveProp('accessibilityLabel', '10:00 remaining');
  });

  it('counts down as time passes', async () => {
    await renderWithTheme(<ExamTimer expiresAt={at(45)} onExpired={jest.fn()} />);

    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });

    expect(screen.getByText('44:00')).toBeOnTheScreen();
  });

  it('calls onExpired when the clock runs out', async () => {
    const onExpired = jest.fn();
    await renderWithTheme(<ExamTimer expiresAt={at(1)} onExpired={onExpired} />);

    await act(async () => {
      jest.advanceTimersByTime(61_000);
    });

    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('calls it once and only once, so it cannot race its own submission', async () => {
    const onExpired = jest.fn();
    await renderWithTheme(<ExamTimer expiresAt={at(1)} onExpired={onExpired} />);

    await act(async () => {
      jest.advanceTimersByTime(300_000);
    });

    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('starts at zero for a deadline already past, without ever going negative', async () => {
    await renderWithTheme(<ExamTimer expiresAt={at(-5)} onExpired={jest.fn()} />);

    expect(screen.getByText('0:00')).toBeOnTheScreen();
  });

  it('becomes a live region only when it is urgent', async () => {
    await renderWithTheme(<ExamTimer expiresAt={at(30)} onExpired={jest.fn()} />);
    expect(screen.getByTestId('exam-timer')).toHaveProp('accessibilityLiveRegion', 'none');

    await act(async () => {
      jest.advanceTimersByTime(29 * 60_000 + 30_000);
    });

    // Interrupting a learner every minute for 45 minutes would be worse than useless; from
    // the last minute it is worth saying (SPEC §47).
    expect(screen.getByTestId('exam-timer')).toHaveProp('accessibilityLiveRegion', 'polite');
  });
});

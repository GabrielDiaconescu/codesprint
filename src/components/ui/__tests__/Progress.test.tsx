import { screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test-utils';

import { ProgressBar, clampProgress } from '../ProgressBar';
import { ProgressRing } from '../ProgressRing';

describe('clampProgress', () => {
  it.each([
    [0, 0],
    [0.5, 0.5],
    [1, 1],
    [-3, 0],
    [1.4, 1],
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 1],
    [Number.NEGATIVE_INFINITY, 0],
  ])('clamps %p to %p', (input, expected) => {
    expect(clampProgress(input)).toBe(expected);
  });
});

describe('ProgressBar', () => {
  it('exposes its value to screen readers as a percentage (SPEC §47)', async () => {
    await renderWithTheme(<ProgressBar value={0.48} label="Today's goal" />);

    const bar = screen.getByRole('progressbar', { name: "Today's goal" });
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 48 });
  });

  it('reports a clamped value rather than an out-of-range one', async () => {
    await renderWithTheme(<ProgressBar value={2} label="Overflow" />);

    expect(screen.getByRole('progressbar', { name: 'Overflow' }).props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 100,
    });
  });
});

describe('ProgressRing', () => {
  it('exposes its value to screen readers', async () => {
    await renderWithTheme(<ProgressRing value={0.25} label="Level progress" />);

    expect(
      screen.getByRole('progressbar', { name: 'Level progress' }).props.accessibilityValue,
    ).toEqual({ min: 0, max: 100, now: 25 });
  });
});

import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test-utils';

import { Toggle } from '../Toggle';

describe('Toggle', () => {
  it('reports a change', async () => {
    const onValueChange = jest.fn();
    await renderWithTheme(
      <Toggle
        testID="analytics"
        label="Help improve CodeSprint"
        value={false}
        onValueChange={onValueChange}
      />,
    );

    await fireEvent(screen.getByTestId('analytics'), 'valueChange', true);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('does not report a change while disabled', async () => {
    // The consent step disables this for minors; a change slipping through would contradict
    // the explanation shown right beside it (SPEC §41).
    const onValueChange = jest.fn();
    await renderWithTheme(
      <Toggle
        testID="analytics"
        label="Help improve CodeSprint"
        value={false}
        onValueChange={onValueChange}
        disabled
      />,
    );

    expect(screen.getByTestId('analytics')).toHaveProp('disabled', true);
  });

  it('names the setting for a screen reader rather than announcing a bare switch', async () => {
    await renderWithTheme(
      <Toggle
        testID="analytics"
        label="Help improve CodeSprint"
        description="Share anonymous usage data."
        value
        onValueChange={jest.fn()}
      />,
    );

    expect(screen.getByTestId('analytics')).toHaveProp(
      'accessibilityLabel',
      'Help improve CodeSprint. Share anonymous usage data.',
    );
  });

  it('shows the description to sighted users too', async () => {
    await renderWithTheme(
      <Toggle
        label="Help improve CodeSprint"
        description="Share anonymous usage data."
        value={false}
        onValueChange={jest.fn()}
      />,
    );

    expect(screen.getByText('Share anonymous usage data.')).toBeOnTheScreen();
  });
});

import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test-utils';

import { Button } from '../Button';

describe('Button', () => {
  it('calls onPress when enabled', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Continue" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Continue" onPress={onPress} disabled />);

    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress while loading, so an RPC cannot be double-submitted', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Check" onPress={onPress} loading />);

    fireEvent.press(screen.getByRole('button', { name: 'Check' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('announces disabled and busy state to screen readers (SPEC §47)', async () => {
    await renderWithTheme(<Button label="Check" loading />);

    const button = screen.getByRole('button', { name: 'Check' });
    expect(button).toBeDisabled();
    expect(button.props.accessibilityState).toMatchObject({ busy: true });
  });

  it('keeps the label accessible in every variant', async () => {
    await renderWithTheme(<Button label="Delete account" variant="danger" onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Delete account' })).toBeOnTheScreen();
  });
});

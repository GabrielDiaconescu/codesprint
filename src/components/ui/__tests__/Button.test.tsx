import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test-utils';

import { Button } from '../Button';

describe('Button', () => {
  it('calls onPress when enabled', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Continue" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Continue" onPress={onPress} disabled />);

    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress while loading, so an RPC cannot be double-submitted', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Check" onPress={onPress} loading />);

    await fireEvent.press(screen.getByRole('button', { name: 'Check' }));
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

  it('announces the label in its own casing, although the face is uppercased', async () => {
    // The face uses textTransform for the look. If the accessibility label picked that up
    // too, VoiceOver would spell "C-O-N-T-I-N-U-E" — the usual way this trick goes wrong.
    await renderWithTheme(<Button label="Continue" onPress={() => {}} />);

    expect(screen.getByLabelText('Continue')).toBeOnTheScreen();
    expect(screen.queryByLabelText('CONTINUE')).toBeNull();
  });

  // One test per variant rather than a loop, so a broken tone names itself in the report
  // instead of failing as "the button test". Cheap, but it is what would have caught a
  // palette token renamed during the restyle and never re-rendered.
  it.each(['primary', 'challenge', 'success', 'secondary', 'ghost', 'danger'] as const)(
    'renders the %s variant and keeps it pressable',
    async (variant) => {
      const onPress = jest.fn();
      await renderWithTheme(<Button label="Go" variant={variant} onPress={onPress} />);

      await fireEvent.press(screen.getByRole('button', { name: 'Go' }));
      expect(onPress).toHaveBeenCalledTimes(1);
    },
  );
});

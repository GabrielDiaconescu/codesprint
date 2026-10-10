import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AuthFailure } from '@/services';
import { useToastStore } from '@/store/toastStore';
import { renderWithProviders } from '@/test-utils';

import { ChangePasswordSheet } from '../ChangePasswordSheet';

/**
 * Changing the password inside the app (SPEC §29). What must hold: nothing is sent until both
 * fields pass — the new one by the sign-up rules; a wrong current password is named as such;
 * success closes the sheet and says that the other devices were signed out.
 */
const mockChangePassword = jest.fn();

jest.mock('@/services', () => ({
  ...jest.requireActual<Record<string, unknown>>('@/services'),
  services: {
    auth: {
      changePassword: (current: string, next: string) =>
        mockChangePassword(current, next) as unknown,
    },
  },
}));

jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
);

beforeEach(() => {
  jest.clearAllMocks();
  useToastStore.setState({ toasts: [] });
});

const fill = async (current: string, next: string) => {
  await fireEvent.changeText(screen.getByTestId('change-password-current'), current);
  await fireEvent.changeText(screen.getByTestId('change-password-new'), next);
  await fireEvent.press(screen.getByTestId('change-password-submit'));
};

describe('ChangePasswordSheet', () => {
  it('sends nothing until the current password is given and the new one follows the rules', async () => {
    await renderWithProviders(<ChangePasswordSheet visible onClose={jest.fn()} />);

    await fill('', 'short');

    expect(screen.getByText('Enter a password.')).toBeOnTheScreen();
    expect(screen.getByText('Use at least 8 characters.')).toBeOnTheScreen();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('changes the password, closes, and says the other devices were signed out', async () => {
    mockChangePassword.mockResolvedValue(undefined);
    const onClose = jest.fn();
    await renderWithProviders(<ChangePasswordSheet visible onClose={onClose} />);

    await fill('old-pass1', 'new-pass2');

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockChangePassword).toHaveBeenCalledWith('old-pass1', 'new-pass2');
    expect(useToastStore.getState().toasts.map((toast) => toast.message)).toEqual([
      'Password changed. Your other devices have been signed out.',
    ]);
  });

  it('names a wrong current password as such', async () => {
    mockChangePassword.mockRejectedValue(new AuthFailure('wrong-password'));
    const onClose = jest.fn();
    await renderWithProviders(<ChangePasswordSheet visible onClose={onClose} />);

    await fill('not-it-1', 'new-pass2');

    expect(await screen.findByText("That isn't your current password.")).toBeOnTheScreen();
    expect(onClose).not.toHaveBeenCalled();
  });
});

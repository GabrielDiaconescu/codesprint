import { waitFor } from '@testing-library/react-native';

import AuthCallbackScreen from '@/app/auth-callback';
import { useSessionStore } from '@/store/sessionStore';
import { renderWithProviders } from '@/test-utils';

/**
 * Where every auth email lands (SPEC §12).
 *
 * The case that matters: opening a confirmation link CHANGES the session — a guest becomes a
 * registered user — while the screen is waiting for the exchange. The screen used to treat that
 * change as a reason to drop the result, and stayed on "Signing you in…" for good. The E2E
 * guest-to-account flow found it on a device; this reproduces it without one.
 */
const mockReplace = jest.fn();
const mockConsume = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => ({ code: 'one-time-code' }),
}));

// The screen reads the safe-area insets; the library ships a mock for tests without a device.
jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
);

jest.mock('@/services', () => ({
  services: {
    auth: { consumeAuthCallback: (params: unknown) => mockConsume(params) as unknown },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  useSessionStore.setState({ status: 'guest' });
});

describe('the auth callback screen', () => {
  it('lands in the app even though signing in changed the session under it', async () => {
    mockConsume.mockImplementation(async () => {
      // What the real exchange does on its way to resolving.
      useSessionStore.setState({ status: 'authenticated' });
      return { kind: 'signed-in' };
    });

    await renderWithProviders(<AuthCallbackScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });

  it('exchanges the code once, however often it re-renders', async () => {
    mockConsume.mockResolvedValue({ kind: 'signed-in' });

    const { rerender } = await renderWithProviders(<AuthCallbackScreen />);
    await rerender(<AuthCallbackScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(mockConsume).toHaveBeenCalledTimes(1);
  });

  it('sends a link it has nothing to do with to wherever the session now belongs', async () => {
    mockConsume.mockImplementation(async () => {
      useSessionStore.setState({ status: 'signed-out' });
      return { kind: 'ignored' };
    });

    await renderWithProviders(<AuthCallbackScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/sign-in'));
  });
});

import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { useSessionStore } from '@/store/sessionStore';
import { renderWithProviders } from '@/test-utils';

import { YourDataCard } from '../YourDataCard';

/**
 * The learner's data rights in the app (SPEC §41).
 *
 * What must hold: the export is the server's document, whole, as a JSON file; deletion never
 * happens without the confirmation that says it is final and does not cancel a subscription;
 * and a failed deletion says so rather than leaving the learner guessing.
 */
const mockExport = jest.fn();
const mockDelete = jest.fn();
const mockShareFile = jest.fn();

jest.mock('@/services', () => ({
  ...jest.requireActual<Record<string, unknown>>('@/services'),
  services: {
    profile: { exportMyData: () => mockExport() as unknown },
    auth: { deleteAccount: () => mockDelete() as unknown },
  },
}));

jest.mock('@/services/files/shareFile', () => ({
  shareTextFile: (args: unknown) => mockShareFile(args) as unknown,
}));

jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
);

beforeEach(() => {
  jest.clearAllMocks();
  useSessionStore.setState({ status: 'authenticated' });
  mockShareFile.mockResolvedValue(undefined);
});

describe('YourDataCard', () => {
  it('exports the server document, whole, as a dated JSON file', async () => {
    mockExport.mockResolvedValue({ format: 'codesprint-data-export', answers: [1, 2] });
    await renderWithProviders(<YourDataCard />);

    await fireEvent.press(screen.getByTestId('your-data-export'));

    await waitFor(() => expect(mockShareFile).toHaveBeenCalled());
    const shared = mockShareFile.mock.calls[0]![0] as {
      fileName: string;
      content: string;
      mimeType: string;
    };
    expect(shared.mimeType).toBe('application/json');
    expect(shared.fileName).toMatch(/^codesprint-data-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(shared.content)).toEqual({
      format: 'codesprint-data-export',
      answers: [1, 2],
    });
  });

  it('deletes nothing until the learner confirms in the sheet', async () => {
    mockDelete.mockResolvedValue({ revenuecat: 'deleted' });
    await renderWithProviders(<YourDataCard />);

    await fireEvent.press(screen.getByTestId('your-data-delete'));
    expect(mockDelete).not.toHaveBeenCalled();

    // The sheet says it is final, and that a store subscription is not cancelled by it.
    expect(screen.getByText(/can't be undone/)).toBeOnTheScreen();
    expect(screen.getByText(/does not cancel a subscription/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('delete-account-confirm'));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledTimes(1));
  });

  it('says so when the deletion did not happen', async () => {
    mockDelete.mockRejectedValue(new Error('network'));
    await renderWithProviders(<YourDataCard />);

    await fireEvent.press(screen.getByTestId('your-data-delete'));
    await fireEvent.press(screen.getByTestId('delete-account-confirm'));

    await waitFor(() => expect(screen.getByTestId('delete-account-error')).toBeOnTheScreen());
  });

  it('tells a guest what they lose without mentioning an email they never gave', async () => {
    useSessionStore.setState({ status: 'guest' });
    await renderWithProviders(<YourDataCard />);

    await fireEvent.press(screen.getByTestId('your-data-delete'));

    expect(screen.queryByText(/email address/)).toBeNull();
    expect(screen.getByText(/progress, XP, streak and achievements/)).toBeOnTheScreen();
  });
});

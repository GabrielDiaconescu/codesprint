import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { renderWithTheme } from '@/test-utils';

import { ForceUpdateScreen } from '../ForceUpdateScreen';

/**
 * The screen a retired build shows (SPEC §50, §51): why, that nothing is lost, and the way out —
 * never a button to nowhere.
 */
const mockCapture = jest.fn();

jest.mock('@/features/analytics/hooks/useAnalytics', () => ({
  useCaptureOnce: (event: string) => mockCapture(event) as unknown,
}));

jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
);

beforeEach(() => {
  jest.restoreAllMocks();
  mockCapture.mockClear();
});

describe('ForceUpdateScreen', () => {
  it('sends the learner to the store listing', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await renderWithTheme(
      <ForceUpdateScreen url="https://play.google.com/store/apps/details?id=com.codesprint.app" />,
    );

    expect(screen.getByText(/progress is saved/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Update'));

    expect(open).toHaveBeenCalledWith(
      'https://play.google.com/store/apps/details?id=com.codesprint.app',
    );
  });

  it('says where to look when there is no listing to link yet', async () => {
    await renderWithTheme(<ForceUpdateScreen url={null} />);

    expect(screen.getByText(/from the App Store/)).toBeOnTheScreen();
    expect(screen.queryByText('Update')).toBeNull();
  });

  it('is counted, so a raised minimum can be watched as it takes effect (SPEC §43)', async () => {
    await renderWithTheme(<ForceUpdateScreen url={null} />);

    expect(mockCapture).toHaveBeenCalledWith('force_update_shown');
  });
});

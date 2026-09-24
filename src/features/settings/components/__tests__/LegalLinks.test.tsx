import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { renderWithTheme } from '@/test-utils';

import { LegalLinks } from '../LegalLinks';

/**
 * The legal and support links (SPEC §29, §33). Absent where the pages are not hosted; real
 * links, to the right page, where they are.
 */
let mockBase: string | undefined;

jest.mock('@/lib/env', () => ({
  getEnv: () => ({ EXPO_PUBLIC_LEGAL_BASE_URL: mockBase }),
}));

beforeEach(() => {
  jest.restoreAllMocks();
  mockBase = undefined;
});

describe('LegalLinks', () => {
  it('shows nothing where the pages are not hosted', async () => {
    await renderWithTheme(<LegalLinks links={['terms', 'privacy']} />);

    expect(screen.queryByTestId('legal-terms')).toBeNull();
    expect(screen.queryByTestId('legal-privacy')).toBeNull();
  });

  it('opens the page it names', async () => {
    mockBase = 'https://codesprint.example';
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await renderWithTheme(<LegalLinks links={['terms', 'privacy']} />);

    await fireEvent.press(screen.getByTestId('legal-terms'));

    expect(open).toHaveBeenCalledWith('https://codesprint.example/terms.html');
    expect(screen.getByTestId('legal-privacy')).toBeOnTheScreen();
    expect(screen.queryByTestId('legal-support')).toBeNull();
  });
});

import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test-utils';

import { LanguageSettingsCard } from '../LanguageSettingsCard';

/**
 * The language setting (SPEC §29, §38).
 *
 * The rule worth a rendered test: every language is listed **in its own language**, so a
 * learner who switched to one they cannot read can still find the way back.
 */
const mockSetLanguagePreference = jest.fn();
let mockPreference = 'system';

jest.mock('@/store/settingsStore', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      // ThemeProvider reads the same store; without a theme there are no colours to render.
      themePreference: 'light',
      languagePreference: mockPreference,
      setLanguagePreference: mockSetLanguagePreference,
    }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPreference = 'system';
});

describe('LanguageSettingsCard', () => {
  it('offers the phone language first, then every language by its own name', async () => {
    await renderWithProviders(<LanguageSettingsCard />);

    expect(screen.getByTestId('language-system')).toBeOnTheScreen();
    expect(screen.getByText('English')).toBeOnTheScreen();
    expect(screen.getByText('Română')).toBeOnTheScreen();
  });

  it('marks the current choice as selected', async () => {
    mockPreference = 'ro';
    await renderWithProviders(<LanguageSettingsCard />);

    expect(screen.getByTestId('language-ro').props.accessibilityState).toMatchObject({
      selected: true,
    });
  });

  it('saves the language the learner picks', async () => {
    await renderWithProviders(<LanguageSettingsCard />);

    fireEvent.press(screen.getByTestId('language-ro'));

    expect(mockSetLanguagePreference).toHaveBeenCalledWith('ro');
  });

  it('does not warn about untranslated lessons while the interface is in English', async () => {
    // The note exists for a Romanian interface over English lessons. In English it would be
    // telling someone that English lessons are in English.
    await renderWithProviders(<LanguageSettingsCard />);

    expect(screen.queryByTestId('language-content-note')).toBeNull();
  });
});

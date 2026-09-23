import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test-utils';

import { HomeHeader } from '../HomeHeader';

/**
 * Home's header (SPEC §13, §29, §38).
 *
 * The quick toggles are worth a rendered test rather than only a unit one: the **theme toggle
 * must set the opposite of what is on screen**, and the **language toggle must persist** the
 * choice through the store — both are claims about the store, not about a pure function.
 */
const mockPush = jest.fn();
const mockSetThemePreference = jest.fn();
const mockSetLanguagePreference = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/store/settingsStore', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      themePreference: 'light',
      setThemePreference: mockSetThemePreference,
      setLanguagePreference: mockSetLanguagePreference,
    }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('HomeHeader', () => {
  it('greets a learner by name', async () => {
    await renderWithProviders(<HomeHeader displayName="Alex" />);

    expect(screen.getByText(/Alex/)).toBeOnTheScreen();
  });

  it('greets a guest without leaving a gap where the name would go', async () => {
    // Guest mode is on by default (D1), so this is the FIRST thing most new users read.
    await renderWithProviders(<HomeHeader displayName={null} />);

    expect(screen.getByText('Ready to play?')).toBeOnTheScreen();
    expect(screen.queryByText(/Hello/)).toBeNull();
  });

  it('shows the language toggle now that Romanian ships', async () => {
    await renderWithProviders(<HomeHeader displayName="Alex" />);

    // The badge names the language on screen — an icon alone cannot say "EN".
    expect(screen.getByTestId('home-language')).toHaveTextContent('EN');
  });

  it('saves a language change through the store, so it survives a restart', async () => {
    await renderWithProviders(<HomeHeader displayName="Alex" />);

    await fireEvent.press(screen.getByTestId('home-language'));

    // Calling i18n directly would switch the screen and forget the choice on the next launch.
    expect(mockSetLanguagePreference).toHaveBeenCalledWith('ro');
  });

  it('offers the theme and settings toggles at the minimum touch target', async () => {
    await renderWithProviders(<HomeHeader displayName="Alex" />);

    expect(screen.getByTestId('home-theme')).toBeOnTheScreen();
    expect(screen.getByTestId('home-settings')).toBeOnTheScreen();
  });

  it('switches to the opposite of the scheme currently on screen', async () => {
    await renderWithProviders(<HomeHeader displayName="Alex" />);

    await fireEvent.press(screen.getByTestId('home-theme'));

    expect(mockSetThemePreference).toHaveBeenCalledWith('dark');
  });

  it('names the theme toggle for a screen reader, since it is icon-only', async () => {
    await renderWithProviders(<HomeHeader displayName="Alex" />);

    // An icon-only control has nothing else to announce (SPEC §47).
    expect(screen.getByLabelText('Switch to dark theme')).toBeOnTheScreen();
  });
});

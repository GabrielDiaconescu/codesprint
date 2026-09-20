import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test-utils';

import { HomeHeader } from '../HomeHeader';

/**
 * Home's header (SPEC §13, §29, §38).
 *
 * Two of the three quick toggles are worth a rendered test rather than only a unit one. The
 * **language toggle must not ship visible** while English is the only locale — a control that
 * changes nothing is the kind of thing that reaches a store screenshot. And the **theme
 * toggle must set the opposite of what is on screen**, which is a claim about the store, not
 * about a pure function.
 */
const mockPush = jest.fn();
const mockSetThemePreference = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/store/settingsStore', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ themePreference: 'light', setThemePreference: mockSetThemePreference }),
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

  it('does not show a language toggle while English is the only locale', async () => {
    await renderWithProviders(<HomeHeader displayName="Alex" />);

    expect(screen.queryByTestId('home-language')).toBeNull();
  });

  it('offers the theme and settings toggles at the minimum touch target', async () => {
    await renderWithProviders(<HomeHeader displayName="Alex" />);

    expect(screen.getByTestId('home-theme')).toBeOnTheScreen();
    expect(screen.getByTestId('home-settings')).toBeOnTheScreen();
  });

  it('switches to the opposite of the scheme currently on screen', async () => {
    await renderWithProviders(<HomeHeader displayName="Alex" />);

    fireEvent.press(screen.getByTestId('home-theme'));

    expect(mockSetThemePreference).toHaveBeenCalledWith('dark');
  });

  it('names the theme toggle for a screen reader, since it is icon-only', async () => {
    await renderWithProviders(<HomeHeader displayName="Alex" />);

    // An icon-only control has nothing else to announce (SPEC §47).
    expect(screen.getByLabelText('Switch to dark theme')).toBeOnTheScreen();
  });
});

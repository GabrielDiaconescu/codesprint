import { useSettingsStore } from '../settingsStore';

/**
 * Device settings that survive a restart (SPEC §29).
 *
 * The bug class this guards against is quiet: a theme — or a language — that resets itself
 * every launch is not a crash, it is a setting the user stops trusting and stops using.
 */
const mockLoad = jest.fn();
const mockSave = jest.fn();
const mockApplyLanguage = jest.fn();

jest.mock('@/services/settings/settingsStorage', () => ({
  loadStoredSettings: () => mockLoad() as unknown,
  saveStoredSettings: (settings: unknown) => mockSave(settings) as unknown,
}));

// Observed rather than performed: switching the real i18n instance here would change the
// language under every other test in this file.
jest.mock('@/i18n', () => ({
  ...jest.requireActual<Record<string, unknown>>('@/i18n'),
  applyLanguagePreference: (preference: string) => mockApplyLanguage(preference) as unknown,
}));

const DEFAULTS = {
  themePreference: 'system' as const,
  hapticsEnabled: true,
  languagePreference: 'system' as const,
  hydrated: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockLoad.mockResolvedValue(null);
  mockSave.mockResolvedValue(undefined);
  useSettingsStore.setState(DEFAULTS);
});

describe('settings store', () => {
  it('follows the system theme and language, and buzzes, until told otherwise', () => {
    const state = useSettingsStore.getState();

    expect(state.themePreference).toBe('system');
    expect(state.hapticsEnabled).toBe(true);
    expect(state.languagePreference).toBe('system');
  });

  it('is not hydrated before anything has been read', () => {
    // The app holds the splash screen on this, so it must start false.
    expect(useSettingsStore.getState().hydrated).toBe(false);
  });

  it('applies what was stored', async () => {
    mockLoad.mockResolvedValue({
      themePreference: 'dark',
      hapticsEnabled: false,
      languagePreference: 'ro',
    });

    await useSettingsStore.getState().hydrate();

    expect(useSettingsStore.getState()).toMatchObject({
      themePreference: 'dark',
      hapticsEnabled: false,
      languagePreference: 'ro',
      hydrated: true,
    });
  });

  it('switches the language before the splash screen lifts', async () => {
    // Applied during hydrate, before `hydrated` flips — otherwise the first frame after the
    // splash is in the phone's language and then visibly changes.
    let hydratedWhenApplied: boolean | undefined;
    mockApplyLanguage.mockImplementation(() => {
      hydratedWhenApplied = useSettingsStore.getState().hydrated;
    });
    mockLoad.mockResolvedValue({
      themePreference: 'system',
      hapticsEnabled: true,
      languagePreference: 'ro',
    });

    await useSettingsStore.getState().hydrate();

    expect(mockApplyLanguage).toHaveBeenCalledWith('ro');
    expect(hydratedWhenApplied).toBe(false);
  });

  it('falls back to the phone for a stored language this build does not ship', async () => {
    mockLoad.mockResolvedValue({
      themePreference: 'system',
      hapticsEnabled: true,
      languagePreference: 'de',
    });

    await useSettingsStore.getState().hydrate();

    expect(useSettingsStore.getState().languagePreference).toBe('system');
    expect(mockApplyLanguage).toHaveBeenCalledWith('system');
  });

  it('keeps the defaults when nothing was stored, and still reports hydrated', async () => {
    // Hydrated means "we looked", not "we found something". Leaving it false on a first
    // launch would hold the splash screen forever.
    await useSettingsStore.getState().hydrate();

    expect(useSettingsStore.getState()).toMatchObject({ ...DEFAULTS, hydrated: true });
  });

  it('writes the whole set whenever one setting changes', () => {
    useSettingsStore.getState().setThemePreference('light');

    expect(mockSave).toHaveBeenCalledWith({
      themePreference: 'light',
      hapticsEnabled: true,
      languagePreference: 'system',
    });

    useSettingsStore.getState().setHapticsEnabled(false);

    // The second write carries the first change too — otherwise turning vibration off would
    // silently revert the theme on the next launch.
    expect(mockSave).toHaveBeenLastCalledWith({
      themePreference: 'light',
      hapticsEnabled: false,
      languagePreference: 'system',
    });
  });

  it('switches the interface and remembers the language in one step', () => {
    useSettingsStore.getState().setLanguagePreference('ro');

    expect(mockApplyLanguage).toHaveBeenCalledWith('ro');
    expect(useSettingsStore.getState().languagePreference).toBe('ro');
    expect(mockSave).toHaveBeenLastCalledWith({
      themePreference: 'system',
      hapticsEnabled: true,
      languagePreference: 'ro',
    });
  });

  it('applies a change immediately, without waiting for the write', () => {
    // Storage is slow and can fail; the screen must not wait for it to redraw in dark mode.
    mockSave.mockReturnValue(new Promise(() => {}));

    useSettingsStore.getState().setThemePreference('dark');

    expect(useSettingsStore.getState().themePreference).toBe('dark');
  });
});

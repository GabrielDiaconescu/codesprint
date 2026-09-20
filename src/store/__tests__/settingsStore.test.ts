import { useSettingsStore } from '../settingsStore';

/**
 * Device settings that survive a restart (SPEC §29).
 *
 * The bug class this guards against is quiet: a theme that resets itself every launch is not
 * a crash, it is a setting the user stops trusting and stops using.
 */
const mockLoad = jest.fn();
const mockSave = jest.fn();

jest.mock('@/services/settings/settingsStorage', () => ({
  loadStoredSettings: () => mockLoad() as unknown,
  saveStoredSettings: (settings: unknown) => mockSave(settings) as unknown,
}));

const DEFAULTS = { themePreference: 'system' as const, hapticsEnabled: true, hydrated: false };

beforeEach(() => {
  jest.clearAllMocks();
  mockLoad.mockResolvedValue(null);
  mockSave.mockResolvedValue(undefined);
  useSettingsStore.setState(DEFAULTS);
});

describe('settings store', () => {
  it('follows the system theme and buzzes until told otherwise', () => {
    const state = useSettingsStore.getState();

    expect(state.themePreference).toBe('system');
    expect(state.hapticsEnabled).toBe(true);
  });

  it('is not hydrated before anything has been read', () => {
    // The app holds the splash screen on this, so it must start false.
    expect(useSettingsStore.getState().hydrated).toBe(false);
  });

  it('applies what was stored', async () => {
    mockLoad.mockResolvedValue({ themePreference: 'dark', hapticsEnabled: false });

    await useSettingsStore.getState().hydrate();

    expect(useSettingsStore.getState()).toMatchObject({
      themePreference: 'dark',
      hapticsEnabled: false,
      hydrated: true,
    });
  });

  it('keeps the defaults when nothing was stored, and still reports hydrated', async () => {
    // Hydrated means "we looked", not "we found something". Leaving it false on a first
    // launch would hold the splash screen forever.
    await useSettingsStore.getState().hydrate();

    expect(useSettingsStore.getState()).toMatchObject({ ...DEFAULTS, hydrated: true });
  });

  it('writes the whole set whenever one setting changes', () => {
    useSettingsStore.getState().setThemePreference('light');

    expect(mockSave).toHaveBeenCalledWith({ themePreference: 'light', hapticsEnabled: true });

    useSettingsStore.getState().setHapticsEnabled(false);

    // The second write carries the first change too — otherwise turning vibration off would
    // silently revert the theme on the next launch.
    expect(mockSave).toHaveBeenLastCalledWith({
      themePreference: 'light',
      hapticsEnabled: false,
    });
  });

  it('applies a change immediately, without waiting for the write', () => {
    // Storage is slow and can fail; the screen must not wait for it to redraw in dark mode.
    mockSave.mockReturnValue(new Promise(() => {}));

    useSettingsStore.getState().setThemePreference('dark');

    expect(useSettingsStore.getState().themePreference).toBe('dark');
  });
});

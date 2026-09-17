import { DEFAULT_APP_CONFIG } from '../defaults';
import { parseAppConfig } from '../schema';

/**
 * Config parsing is the app's first contact with server data on every launch, so its failure
 * modes matter more than the happy path: a malformed row must degrade one flag, never the
 * whole session (SPEC §50).
 */
describe('parseAppConfig', () => {
  it('accepts a well-formed response', () => {
    const { values, invalidKeys } = parseAppConfig({
      free_module_count: 8,
      lives_max: 3,
      content_version: 42,
      leaderboard_enabled: false,
      min_supported_app_version: '1.2.0',
    });

    expect(invalidKeys).toEqual([]);
    expect(values.free_module_count).toBe(8);
    expect(values.lives_max).toBe(3);
    expect(values.content_version).toBe(42);
    expect(values.leaderboard_enabled).toBe(false);
    expect(values.min_supported_app_version).toBe('1.2.0');
  });

  it('fills missing keys from the bundled defaults', () => {
    const { values } = parseAppConfig({ content_version: 7 });

    expect(values.content_version).toBe(7);
    expect(values.free_module_count).toBe(DEFAULT_APP_CONFIG.free_module_count);
    expect(values.lives_max).toBe(DEFAULT_APP_CONFIG.lives_max);
  });

  it('falls back per key instead of discarding the whole response', () => {
    const { values, invalidKeys } = parseAppConfig({
      free_module_count: 'six', // wrong type
      lives_max: 4, // fine
    });

    expect(invalidKeys).toEqual(['free_module_count']);
    expect(values.free_module_count).toBe(DEFAULT_APP_CONFIG.free_module_count);
    expect(values.lives_max).toBe(4);
  });

  it('rejects out-of-range numbers', () => {
    const { values, invalidKeys } = parseAppConfig({ lives_max: 0, free_module_count: -3 });

    expect(invalidKeys).toEqual(expect.arrayContaining(['lives_max', 'free_module_count']));
    expect(values.lives_max).toBe(DEFAULT_APP_CONFIG.lives_max);
  });

  it('ignores unknown keys, so a newer server does not break an older client', () => {
    const { values, invalidKeys } = parseAppConfig({
      content_version: 3,
      some_future_flag: true,
    });

    expect(invalidKeys).toEqual([]);
    expect(values.content_version).toBe(3);
    expect(values).not.toHaveProperty('some_future_flag');
  });

  it('forces offline_mode_enabled to false even if the server says otherwise', () => {
    // SPEC §50: reserved flag. Enabling it would switch on a code path that does not exist.
    const { values } = parseAppConfig({ offline_mode_enabled: true });
    expect(values.offline_mode_enabled).toBe(false);
  });

  it.each([null, undefined, 'a string', 42, []])(
    'falls back entirely for a non-object response: %p',
    (raw) => {
      const { values, invalidKeys } = parseAppConfig(raw);
      expect(values).toEqual(DEFAULT_APP_CONFIG);
      expect(invalidKeys.length).toBeGreaterThan(0);
    },
  );
});

// RNTL v13+ registers its Jest matchers (toBeOnTheScreen, ...) automatically on import,
// so no extend-expect entry point is needed.

// Tests must never depend on the developer's local .env.
process.env.EXPO_PUBLIC_APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US' }],
}));

// Initialise i18n once for the whole suite.
//
// Components read their copy through useTranslation, so without this they render raw keys
// ("answering.comingSoon") and every assertion on visible text is meaningless. Initialising
// the real instance rather than stubbing it means the tests also assert the actual English
// strings, which catches a missing key as a failing test instead of a key on screen.
require('./src/i18n').initI18n();

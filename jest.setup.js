// RNTL v13+ registers its Jest matchers (toBeOnTheScreen, ...) automatically on import,
// so no extend-expect entry point is needed.

// Tests must never depend on the developer's local .env.
process.env.EXPO_PUBLIC_APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US' }],
}));

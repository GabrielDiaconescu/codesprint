module.exports = {
  preset: 'jest-expo',
  // Reanimated 4 sits on react-native-worklets, whose `.native.` modules require the native
  // runtime. This resolver (shipped by the package) makes Jest pick the JS implementation.
  resolver: 'react-native-worklets/jest/resolver',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Packages that ship modern ESM Jest cannot parse untransformed:
  //   * `@revenuecat/*`, a transitive dependency of react-native-purchases;
  //   * `standard-navigation`, which expo-router imports — without it, no component that
  //     navigates can be rendered in a test at all;
  //   * `@formatjs/*`, the plural-rules polyfill Hermes needs (src/i18n/pluralRules.ts).
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@sentry/.*|@revenuecat/.*|react-native-google-mobile-ads|standard-navigation|@formatjs/.*)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // jest-expo resolves packages the way a browser would, which picks yaml's ESM build and
    // then fails to parse it. The content pipeline is Node tooling, so point it at the
    // CommonJS entry the `node` export condition would have chosen.
    '^yaml$': '<rootDir>/node_modules/yaml/dist/index.js',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/index.ts', '!src/types/**'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],
};

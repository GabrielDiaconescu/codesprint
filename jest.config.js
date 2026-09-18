module.exports = {
  preset: 'jest-expo',
  // Reanimated 4 sits on react-native-worklets, whose `.native.` modules require the native
  // runtime. This resolver (shipped by the package) makes Jest pick the JS implementation.
  resolver: 'react-native-worklets/jest/resolver',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // `@revenuecat/*` ships modern ESM that Jest cannot parse untransformed. It arrives as a
  // transitive dependency of react-native-purchases, which the registry now imports.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@sentry/.*|@revenuecat/.*)',
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

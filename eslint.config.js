// Flat ESLint config. Pinned to ESLint 9 because eslint-plugin-import (needed for
// import/no-cycle, SPEC §7) does not yet support ESLint 10.
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

/**
 * SDK packages that may only ever be imported from src/services/**.
 * SPEC §7: "Components never import Supabase, RevenueCat, AdMob, PostHog or Sentry
 * directly. Enforce with ESLint restricted imports."
 */
const SDK_ONLY_IN_SERVICES = [
  {
    name: '@supabase/supabase-js',
    message: 'Import Supabase only inside src/services/supabase. Use a feature api.ts instead.',
  },
  {
    name: 'react-native-purchases',
    message: 'Import RevenueCat only inside src/services/billing. Use BillingService instead.',
  },
  {
    name: 'react-native-google-mobile-ads',
    message: 'Import AdMob only inside src/services/ads. Use AdService instead.',
  },
  {
    name: 'posthog-react-native',
    message: 'Import PostHog only inside src/services/analytics. Use AnalyticsService instead.',
  },
  {
    name: '@sentry/react-native',
    message: 'Import Sentry only inside src/services/monitoring. Use MonitoringService instead.',
  },
  {
    name: 'expo-notifications',
    message:
      'Import expo-notifications only inside src/services/notifications. Use NotificationService instead.',
  },
];

module.exports = [
  ...expoConfig,
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '.expo/**',
      'android/**',
      'ios/**',
      'expo-env.d.ts',
      // Deno, not React Native: Deno.serve, Deno.env and jsr: imports, which this config's
      // parser and resolver know nothing about. The logic they wrap lives in
      // supabase/functions/_shared and is linted, type-checked and unit-tested normally.
      'supabase/functions/*/index.ts',
    ],
  },
  {
    // eslint-config-expo already registers the `import` plugin and its TypeScript resolver,
    // so these blocks only add rules — redefining a plugin is a hard config error.
    files: ['**/*.{ts,tsx,js,jsx}'],
    rules: {
      // SPEC §7: no circular dependencies.
      'import/no-cycle': ['error', { maxDepth: Infinity, ignoreExternal: true }],
      'import/no-duplicates': 'error',
      // Noisy false positives on default-exporting libraries such as i18next, whose
      // default export legitimately carries methods that are also named exports.
      'import/no-named-as-default-member': 'off',
    },
  },
  {
    // The @typescript-eslint plugin is only registered for TypeScript files upstream.
    files: ['**/*.{ts,tsx}'],
    rules: {
      // SPEC §59.7: avoid `any` unless justified.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // The SDK boundary: everything EXCEPT src/services may not touch these packages.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/services/**'],
    rules: {
      'no-restricted-imports': ['error', { paths: SDK_ONLY_IN_SERVICES }],
    },
  },
  // Config files, scripts and tests run in Node and may use console.
  {
    files: [
      '*.config.js',
      '*.config.ts',
      'scripts/**/*.{ts,js}',
      '**/*.test.{ts,tsx}',
      '**/__tests__/**/*.{ts,tsx}',
      'jest.setup.js',
    ],
    // Flat config no longer reads /* eslint-env jest */ comments, so the test globals
    // are declared here instead.
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'import/no-cycle': 'off',
    },
  },
  // Maestro's JavaScript (e2e/scripts): a plain script run by Maestro's engine, whose `http`,
  // `json` and `output` are provided by Maestro, and whose flow env vars arrive as globals.
  {
    files: ['e2e/scripts/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        http: 'readonly',
        json: 'readonly',
        output: 'writable',
        EMAIL: 'readonly',
      },
    },
  },
  prettierConfig,
];

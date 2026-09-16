import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Build variants (SPEC §51).
 *
 * Each variant gets its own bundle identifier / application id and its own scheme so that
 * development, preview and production apps can be installed side by side on one device.
 * The display name and brand strings are NOT duplicated here by hand — they derive from
 * src/constants/brand.ts so a rename stays a one-line change (SPEC §9).
 */
type AppVariant = 'development' | 'preview' | 'production';

const APP_VARIANT = (process.env.EXPO_PUBLIC_APP_ENV ?? 'development') as AppVariant;

// Kept in sync with src/constants/brand.ts by a unit test (brand.test.ts).
const BRAND_NAME = 'CodeSprint';

const BASE_BUNDLE_ID = 'com.codesprint.app';

const VARIANTS: Record<AppVariant, { name: string; bundleId: string; scheme: string }> = {
  development: {
    name: `${BRAND_NAME} (Dev)`,
    bundleId: `${BASE_BUNDLE_ID}.dev`,
    scheme: 'codesprint-dev',
  },
  preview: {
    name: `${BRAND_NAME} (Preview)`,
    bundleId: `${BASE_BUNDLE_ID}.preview`,
    scheme: 'codesprint-preview',
  },
  production: {
    name: BRAND_NAME,
    bundleId: BASE_BUNDLE_ID,
    scheme: 'codesprint',
  },
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = VARIANTS[APP_VARIANT] ?? VARIANTS.development;

  return {
    ...config,
    name: variant.name,
    slug: 'codesprint',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: variant.scheme,
    // SPEC §8: light and dark are both designed; follow the OS.
    userInterfaceStyle: 'automatic',
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: false,
      bundleIdentifier: variant.bundleId,
    },
    android: {
      package: variant.bundleId,
      adaptiveIcon: {
        backgroundColor: '#0B1020',
        foregroundImage: './assets/android-icon-foreground.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    plugins: [
      'expo-router',
      'expo-localization',
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 180,
          resizeMode: 'contain',
          backgroundColor: '#FFFFFF',
          dark: { backgroundColor: '#0B1020' },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      appVariant: APP_VARIANT,
      eas: {
        // Filled in by `eas init` (human action H-EAS, see docs/PROGRESS.md).
        projectId: process.env.EAS_PROJECT_ID,
      },
    },
  };
};

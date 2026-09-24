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

/** The EAS project. Overridable for a fork; the id is not a secret. */
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID ?? '7ab009a0-219f-4861-906f-64431e42ebae';

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = VARIANTS[APP_VARIANT] ?? VARIANTS.development;

  return {
    ...config,
    name: variant.name,
    slug: 'codesprint',
    // The store version. Build numbers are EAS's job (eas.json → appVersionSource: remote,
    // autoIncrement), so this changes only for a release people should see as new.
    version: '1.0.0',
    // Over-the-air JavaScript fixes (SPEC §51). The fingerprint of the native project decides
    // which builds an update may reach: add or upgrade a native module and the fingerprint
    // changes, so JavaScript that needs it can never land on a build that lacks it. A native
    // change always ships as a new store build.
    runtimeVersion: { policy: 'fingerprint' },
    updates: {
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
      // Checked on launch, downloaded in the background, applied on the next launch: never a
      // blank screen waiting on the network.
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
    },
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: variant.scheme,
    // SPEC §8: light and dark are both designed; follow the OS.
    userInterfaceStyle: 'automatic',
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: false,
      bundleIdentifier: variant.bundleId,
      config: {
        // Export compliance: the only encryption is the HTTPS the OS provides, which is exempt.
        // Declared here so App Store Connect stops asking on every TestFlight build.
        usesNonExemptEncryption: false,
      },
      // Apple's privacy manifest (SPEC §41). The required-reason APIs that the app's own code
      // and React Native touch; the SDKs (AdMob, RevenueCat, Sentry, PostHog) ship manifests
      // of their own, which Xcode merges. Verify with Xcode's privacy report on the first iOS
      // build (Phase 22) — see docs/LEGAL.md.
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            // AsyncStorage and SecureStore's metadata live in the app's own UserDefaults.
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
            NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
          },
          {
            // React Native and Expo read timestamps of the app's own files (bundles, caches).
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
            NSPrivacyAccessedAPITypeReasons: ['C617.1'],
          },
          {
            // React Native measures elapsed time for performance and animation.
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
            NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
          },
          {
            // Checked before writing caches, never reported off the device.
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
            NSPrivacyAccessedAPITypeReasons: ['E174.1'],
          },
        ],
      },
    },
    android: {
      package: variant.bundleId,
      adaptiveIcon: {
        // Native colour has to be repeated here by hand: app.config.ts is evaluated by the
        // Expo CLI at build time, long before the React theme exists. Keep these four in
        // step with `src/theme/colors.ts` — a splash in the old white is the first thing a
        // user sees flash into the new cream.
        backgroundColor: '#151226',
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
          backgroundColor: '#FBF6EC',
          dark: { backgroundColor: '#151226' },
        },
      ],
      [
        'react-native-google-mobile-ads',
        {
          // Build-time and NOT secret (SPEC §56) — an AdMob app id identifies the app to
          // Google, it does not authorise anything. Google's published TEST app ids are the
          // default so a build without credentials still runs; a production build overrides
          // them, and `adUnitId` independently refuses to serve live units outside
          // production (SPEC §59.31).
          androidAppId:
            process.env.ADMOB_APP_ID_ANDROID ?? 'ca-app-pub-3940256099942544~3347511713',
          iosAppId: process.env.ADMOB_APP_ID_IOS ?? 'ca-app-pub-3940256099942544~1458002511',
          // Delays measurement until `initialize()` runs, which happens only after consent
          // has been resolved (SPEC §41).
          delayAppMeasurementInit: true,
        },
      ],
      [
        'expo-notifications',
        {
          // Android draws a notification icon from its ALPHA channel only: a full-colour app
          // icon arrives as a white square. The monochrome adaptive layer is already the
          // right shape, so it is reused rather than adding another asset.
          icon: './assets/android-icon-monochrome.png',
          color: '#1C5FF5',
        },
      ],
      [
        '@sentry/react-native/expo',
        {
          // Source maps and native debug symbols are uploaded while a release build is made, so
          // a production crash arrives readable (SPEC §44). Organisation and project come from
          // SENTRY_ORG / SENTRY_PROJECT and the token from SENTRY_AUTH_TOKEN, all in the EAS
          // environment — never here, where the token would end up in the app package.
          // Development and preview builds set SENTRY_DISABLE_AUTO_UPLOAD in eas.json.
          organization: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
        },
      ],
      [
        'expo-tracking-transparency',
        {
          // Shown only when personalised ads are actually requested, and only after UMP.
          userTrackingPermission:
            'CodeSprint asks so that the ads you see can be more relevant. ' +
            'Your lessons, streak and progress work exactly the same either way.',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    // Which EAS account owns the builds. Pinned because this login has access to two, and
    // "which account did that build go to" is not a question worth answering twice.
    owner: 'gabrieldiaconescu',
    extra: {
      appVariant: APP_VARIANT,
      eas: {
        /**
         * The EAS project id.
         *
         * Hardcoded with an env override rather than read only from `.env`, because `.env` is
         * gitignored: a fresh clone — another machine, or CI in Phase 22 — would otherwise
         * fail to build with a confusing "no project id" rather than just working.
         *
         * It is not a secret. It appears in the public project URL:
         * https://expo.dev/accounts/gabrieldiaconescu/projects/codesprint
         */
        projectId: EAS_PROJECT_ID,
      },
    },
  };
};

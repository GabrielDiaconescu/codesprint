// First, before i18next can pluralise anything — see the file for why.
import './pluralRules';

import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ads from './locales/en/ads.json';
import auth from './locales/en/auth.json';
import challenge from './locales/en/challenge.json';
import common from './locales/en/common.json';
import exam from './locales/en/exam.json';
import home from './locales/en/home.json';
import leaderboard from './locales/en/leaderboard.json';
import learn from './locales/en/learn.json';
import lesson from './locales/en/lesson.json';
import navigation from './locales/en/navigation.json';
import notifications from './locales/en/notifications.json';
import onboarding from './locales/en/onboarding.json';
import paywall from './locales/en/paywall.json';
import practice from './locales/en/practice.json';
import privacy from './locales/en/privacy.json';
import profile from './locales/en/profile.json';
import progress from './locales/en/progress.json';
import settings from './locales/en/settings.json';
import roAds from './locales/ro/ads.json';
import roAuth from './locales/ro/auth.json';
import roChallenge from './locales/ro/challenge.json';
import roCommon from './locales/ro/common.json';
import roExam from './locales/ro/exam.json';
import roHome from './locales/ro/home.json';
import roLeaderboard from './locales/ro/leaderboard.json';
import roLearn from './locales/ro/learn.json';
import roLesson from './locales/ro/lesson.json';
import roNavigation from './locales/ro/navigation.json';
import roNotifications from './locales/ro/notifications.json';
import roOnboarding from './locales/ro/onboarding.json';
import roPaywall from './locales/ro/paywall.json';
import roPractice from './locales/ro/practice.json';
import roPrivacy from './locales/ro/privacy.json';
import roProfile from './locales/ro/profile.json';
import roProgress from './locales/ro/progress.json';
import roSettings from './locales/ro/settings.json';

/**
 * i18n setup (SPEC §38).
 *
 * English and Romanian. The interface is fully translated in both; lesson CONTENT is English
 * for now, and the server falls back to English for any field without a translation
 * (`localized_text` in the lesson engine), so a Romanian interface over English lessons is a
 * supported state rather than a broken one.
 *
 * No user-facing string is hardcoded in a component, and no string is built by concatenation.
 */
export const FALLBACK_LOCALE = 'en';

export const resources = {
  en: {
    common,
    navigation,
    auth,
    ads,
    onboarding,
    home,
    learn,
    lesson,
    practice,
    challenge,
    leaderboard,
    exam,
    paywall,
    notifications,
    privacy,
    profile,
    progress,
    settings,
  },
  ro: {
    common: roCommon,
    navigation: roNavigation,
    auth: roAuth,
    ads: roAds,
    onboarding: roOnboarding,
    home: roHome,
    learn: roLearn,
    lesson: roLesson,
    practice: roPractice,
    challenge: roChallenge,
    leaderboard: roLeaderboard,
    exam: roExam,
    paywall: roPaywall,
    notifications: roNotifications,
    privacy: roPrivacy,
    profile: roProfile,
    progress: roProgress,
    settings: roSettings,
  },
} as const;

export type AppLocale = keyof typeof resources;

/** Every locale the app ships, in the order a language picker lists them. */
export const SUPPORTED_LOCALES = Object.keys(resources) as AppLocale[];

/** A learner's choice: a specific language, or whatever the phone is set to. */
export type LanguagePreference = AppLocale | 'system';

export const NAMESPACES = Object.keys(resources.en) as (keyof typeof resources.en)[];

const isSupported = (locale: string | undefined): locale is AppLocale =>
  locale !== undefined && (SUPPORTED_LOCALES as string[]).includes(locale);

/** Narrows anything read from storage to a preference this build understands. */
export const parseLanguagePreference = (value: string | undefined): LanguagePreference =>
  isSupported(value) ? value : 'system';

/**
 * The locale to actually use.
 *
 * An explicit choice wins. Otherwise the phone's first language is used if the app ships it,
 * and English if it does not — a phone set to German gets English, not a half-empty screen.
 */
export const resolveLocale = (preference: LanguagePreference = 'system'): AppLocale => {
  if (preference !== 'system' && isSupported(preference)) return preference;
  const device = getLocales()[0]?.languageCode ?? undefined;
  return isSupported(device) ? device : FALLBACK_LOCALE;
};

export const initI18n = () => {
  if (i18n.isInitialized) return i18n;

  void i18n.use(initReactI18next).init({
    resources,
    lng: resolveLocale(),
    fallbackLng: FALLBACK_LOCALE,
    defaultNS: 'common',
    ns: NAMESPACES,
    // React already escapes rendered values.
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  return i18n;
};

/**
 * Switches the interface to what `preference` resolves to.
 *
 * A no-op when nothing would change, so calling it on every hydrate is free. Every screen
 * using `useTranslation` re-renders on the switch; data fetched in the old language is
 * refetched because every localised query key carries the locale.
 */
export const applyLanguagePreference = (preference: LanguagePreference): AppLocale => {
  const locale = resolveLocale(preference);
  if (i18n.language !== locale) void i18n.changeLanguage(locale);
  return locale;
};

export default i18n;

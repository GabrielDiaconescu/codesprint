import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ads from './locales/en/ads.json';
import auth from './locales/en/auth.json';
import common from './locales/en/common.json';
import exam from './locales/en/exam.json';
import home from './locales/en/home.json';
import leaderboard from './locales/en/leaderboard.json';
import learn from './locales/en/learn.json';
import lesson from './locales/en/lesson.json';
import challenge from './locales/en/challenge.json';
import navigation from './locales/en/navigation.json';
import practice from './locales/en/practice.json';
import onboarding from './locales/en/onboarding.json';
import paywall from './locales/en/paywall.json';
import profile from './locales/en/profile.json';
import progress from './locales/en/progress.json';

/**
 * i18n setup (SPEC §38).
 *
 * English only at launch; the architecture is ready for Romanian, Spanish, German, French.
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
    profile,
    progress,
  },
} as const;

export const NAMESPACES = Object.keys(resources.en) as (keyof typeof resources.en)[];

/** Best available locale, narrowed to what we actually ship. */
export const resolveLocale = (): string => {
  const preferred = getLocales()[0]?.languageCode ?? FALLBACK_LOCALE;
  return preferred in resources ? preferred : FALLBACK_LOCALE;
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

export default i18n;

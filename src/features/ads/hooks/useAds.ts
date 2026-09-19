import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppConfig } from '@/features/config/hooks/useAppConfig';
import { classifyAge } from '@/features/onboarding/logic/age';
import { useEntitlements } from '@/features/paywall/hooks/useEntitlements';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { services } from '@/services';
import { setAdGate } from '@/services/ads/GoogleAdService';
import { useAdStore } from '@/store/adStore';

import { canRequestAds, shouldShowInterstitial } from '../logic/frequency';

/**
 * Who this learner is, from the ads system's point of view (SPEC §30, §41).
 *
 * Everything the ad service is allowed to know comes through here, and it is recomputed
 * whenever the entitlement, the remote flag, the profile or consent changes. The service
 * itself holds no opinion — it reads this gate and nothing else.
 */
export const useAdsBootstrap = (): void => {
  const { data: entitlements } = useEntitlements();
  const { data: profile } = useProfile();
  const { data: config } = useAppConfig();
  const markSessionStart = useAdStore((state) => state.markSessionStart);

  const isProtectedMinor =
    profile == null ||
    profile.birthYear === null ||
    classifyAge(profile.birthYear, {
      minUserAge: config.min_user_age,
      minorProtectionAge: config.minor_protection_age,
    }) === 'protected-minor';

  useEffect(() => {
    markSessionStart();
  }, [markSessionStart]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // UMP first, always. Nothing may be requested until it has been answered, and the
        // form itself is shown only where one is required (SPEC §41).
        const consent = await services.consent.initialize();
        const resolved = await services.consent.requestIfNeeded();
        if (cancelled) return;

        setAdGate({
          isAdFree: entitlements.is_ad_free,
          adsEnabledRemotely: config.ads_enabled,
          isProtectedMinor,
          adsConsentObtained: resolved.canRequestPersonalizedAds,
          consentResolved: resolved.canRequestAds || consent.canRequestAds,
        });

        // Checked BEFORE initializing, so a paying subscriber never has an ad SDK started on
        // their behalf (SPEC §30).
        if (
          canRequestAds({
            isAdFree: entitlements.is_ad_free,
            adsEnabledRemotely: config.ads_enabled,
            consentResolved: resolved.canRequestAds,
          })
        ) {
          await services.ads.initialize();
        }
      } catch (error) {
        // An ad system that cannot start must never stop somebody learning.
        services.monitoring.captureException(error, { stage: 'ads-bootstrap' });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    entitlements.is_ad_free,
    config.ads_enabled,
    config.min_user_age,
    config.minor_protection_age,
    isProtectedMinor,
  ]);
};

/** Whether a banner may be rendered at all right now. */
export const useCanShowAds = (): boolean => {
  const { data: entitlements } = useEntitlements();
  const { data: config } = useAppConfig();

  return !entitlements.is_ad_free && config.ads_enabled && services.ads.canShowAds();
};

/**
 * Shows an interstitial if every pacing rule allows it (SPEC §30, §34).
 *
 * Returns whether one was shown, so the caller can decide what happens next — the lesson
 * completion screen uses it to know whether to offer the paywall afterwards.
 */
export const useInterstitial = () => {
  const { data: entitlements } = useEntitlements();
  const { data: config } = useAppConfig();
  const store = useAdStore();
  const showing = useRef(false);

  void useTranslation('common');

  return useCallback(
    async (lessonsCompleted: number): Promise<boolean> => {
      // One at a time. Two completion screens dismissed quickly must not stack two ads.
      if (showing.current) return false;

      const decision = shouldShowInterstitial(
        {
          lastShownAt: store.lastInterstitialAt,
          shownToday: store.interstitialsToday(),
          lessonsCompleted,
          sessionStartedAt: store.sessionStartedAt,
          now: Date.now(),
          adsAllowed: !entitlements.is_ad_free && config.ads_enabled && services.ads.canShowAds(),
        },
        {
          minMinutesBetween: config.interstitial_min_minutes_between,
          maxPerDay: config.interstitial_max_per_day,
          graceLessons: config.interstitial_grace_lessons,
        },
      );

      if (!decision.show) return false;

      showing.current = true;
      try {
        const shown = await services.ads.showInterstitial('lesson-complete');
        if (shown) store.recordInterstitial();
        return shown;
      } finally {
        showing.current = false;
      }
    },
    [entitlements.is_ad_free, config, store],
  );
};

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import { useCapture } from '@/features/analytics/hooks/useAnalytics';
import { useRefreshEntitlements } from '@/features/paywall/hooks/useEntitlements';
import { services, type CustomerEntitlements } from '@/services';
import { useToastStore } from '@/store/toastStore';

import { manageSubscriptionUrl, type SubscriptionPlatform } from '../logic/manageUrl';

/**
 * Restoring purchases, from anywhere (SPEC §29, §31).
 *
 * Both the paywall and Settings offer this, and the store requires it to exist — so it lives
 * in one place rather than being written twice with two slightly different sets of analytics
 * and two slightly different toasts.
 *
 * "Restored nothing" is not an error and does not get an error toast: it is the normal answer
 * for somebody who has never bought anything, and a red message would read as a fault.
 */
export const useRestorePurchases = () => {
  const { t } = useTranslation('paywall');
  const showToast = useToastStore((state) => state.show);
  const capture = useCapture();
  const refresh = useRefreshEntitlements();
  const [isRestoring, setRestoring] = useState(false);

  const restore = useCallback(() => {
    setRestoring(true);
    capture('restore_started');

    void services.billing
      .restorePurchases()
      .then(async () => {
        // The SERVER decides what the learner now has; the SDK's answer only triggers the
        // re-check (SPEC §31).
        const restored = await refresh.mutateAsync();
        capture('restore_completed', { restored: restored.active.length });
        showToast({
          message: restored.active.length > 0 ? t('restore.done') : t('restore.nothing'),
          tone: restored.active.length > 0 ? 'success' : 'info',
        });
      })
      .catch(() => showToast({ message: t('restore.failed'), tone: 'error' }))
      .finally(() => setRestoring(false));
  }, [capture, refresh, showToast, t]);

  return { restore, isRestoring };
};

const platform = (): SubscriptionPlatform =>
  Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'other';

/**
 * Where to send somebody who wants to cancel or change their plan.
 *
 * Null while the SDK has not answered yet, or on a platform with no store — the button is
 * hidden rather than pointed somewhere arbitrary.
 */
export const useManageSubscriptionUrl = (): string | null => {
  const [customer, setCustomer] = useState<CustomerEntitlements | null>(null);

  useEffect(() => {
    let active = true;

    // Read once rather than subscribed: this URL changes when a purchase is made, and every
    // screen that can make one already invalidates entitlements afterwards.
    void services.billing
      .getCustomerInfo()
      .then((info) => {
        if (active) setCustomer(info);
      })
      .catch(() => {
        // Falls back to the platform page below, which is better than no button at all.
      });

    return () => {
      active = false;
    };
  }, []);

  return manageSubscriptionUrl(platform(), customer?.managementUrl ?? null);
};

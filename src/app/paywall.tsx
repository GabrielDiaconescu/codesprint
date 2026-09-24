import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Divider, Screen, SkeletonLines, StateView, Text } from '@/components/ui';
import { useAppConfig } from '@/features/config/hooks/useAppConfig';
import { PlanCard } from '@/features/paywall/components/PlanCard';
import {
  useEntitlements,
  useOfferings,
  useRefreshEntitlements,
} from '@/features/paywall/hooks/useEntitlements';
import { useCapture, useCaptureOnce } from '@/features/analytics/hooks/useAnalytics';
import {
  useManageSubscriptionUrl,
  useRestorePurchases,
} from '@/features/subscriptions/hooks/useSubscription';
import { annualSavingPercent, buildPlans, type Plan } from '@/features/paywall/logic/plans';
import { PAYWALL_TRIGGERS, type PaywallTrigger } from '@/features/paywall/logic/prompts';
import { LegalLinks } from '@/features/settings/components/LegalLinks';
import { services } from '@/services';
import { useToastStore } from '@/store/toastStore';
import { useTheme } from '@/theme';

/**
 * The paywall (SPEC §33).
 *
 * An honest one, which mostly means a list of things it must not do: no fake countdown, no
 * false scarcity, no pre-selected upsell hiding a cheaper plan, no hidden close button, and
 * nothing described as free that is not. The close control is the first thing in the header
 * and is there from the first frame.
 *
 * It lists only features that exist in the shipped build (SPEC §5). Certificates, offline
 * content and extra courses are not on it and will not be until they ship.
 *
 * Prices come from the store, localized, or the screen says it could not load them. There is
 * no fallback price anywhere in this file, and there must never be (SPEC §31).
 */
export default function PaywallScreen() {
  const { t } = useTranslation('paywall');
  const { t: common } = useTranslation('common');
  const theme = useTheme();
  const router = useRouter();
  const showToast = useToastStore((state) => state.show);
  const { data: config } = useAppConfig();

  const params = useLocalSearchParams<{ trigger?: string }>();
  const trigger: PaywallTrigger = (PAYWALL_TRIGGERS as readonly string[]).includes(
    params.trigger ?? '',
  )
    ? (params.trigger as PaywallTrigger)
    : 'manual';

  const capture = useCapture();

  const offerings = useOfferings();
  const { data: entitlements } = useEntitlements();
  const refresh = useRefreshEntitlements();
  const { restore, isRestoring } = useRestorePurchases();
  const manageUrl = useManageSubscriptionUrl();
  const [busyRole, setBusyRole] = useState<string | null>(null);

  // Once per open, whatever re-renders happen while offerings load — otherwise the
  // conversion denominator quietly doubles (SPEC §43).
  useCaptureOnce('paywall_viewed', { trigger });

  const plans = buildPlans(offerings.data ?? [], {
    active: entitlements.active,
    noAdsExpiresAt: entitlements.no_ads_expires_at,
  });
  const saving = annualSavingPercent(plans);

  const purchase = (plan: Plan) => {
    setBusyRole(plan.role);
    // `product` is a role, not a price or an id — enums and counts only (SPEC §43).
    capture('purchase_started', { product: plan.role });

    void services.billing
      .purchase(plan.product.packageId)
      .then(async () => {
        // RevenueCat says it worked; the SERVER decides whether it did (SPEC §31). Nothing
        // unlocks until `user_entitlements` has been reconciled.
        await refresh.mutateAsync();
        capture('purchase_completed', { product: plan.role });
        showToast({ message: t('purchase.done'), tone: 'success' });
        router.back();
      })
      .catch((error: unknown) => {
        // A cancelled purchase is not a failure and gets no message at all — the customer
        // knows what they just did (SPEC §31).
        if (isCancellation(error)) {
          capture('purchase_cancelled', { product: plan.role });
          return;
        }
        capture('purchase_failed', { product: plan.role });
        showToast({ message: t('purchase.failed'), tone: 'error' });
      })
      .finally(() => setBusyRole(null));
  };

  return (
    <Screen>
      {/* Visible immediately, and never hidden behind a delay (SPEC §33). */}
      <Stack.Screen
        options={{
          title: t('title'),
          presentation: 'modal',
          headerBackVisible: true,
          headerBackTitle: common('actions.close'),
        }}
      />

      <ScrollView
        testID="paywall"
        contentContainerStyle={[styles.content, { gap: theme.spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="title" accessibilityRole="header">
            {t('heading')}
          </Text>
          {/* Why they are seeing this, in one sentence. */}
          <Text variant="body" tone="secondary">
            {t(`trigger.${trigger}`)}
          </Text>
        </View>

        {offerings.isPending ? (
          <SkeletonLines lines={6} />
        ) : offerings.isError || plans.length === 0 ? (
          // No prices, so no paywall. An error with a retry — never invented numbers.
          <StateView
            testID="paywall-unavailable"
            icon="cloud-offline"
            tone="danger"
            title={t('unavailable.title')}
            body={t('unavailable.body')}
            actionLabel={common('actions.retry')}
            onAction={() => void offerings.refetch()}
          />
        ) : (
          plans.map((plan) => (
            <PlanCard
              key={plan.role}
              plan={plan}
              savingPercent={saving}
              onSelect={purchase}
              busy={busyRole === plan.role}
            />
          ))
        )}

        <Card testID="paywall-free" appearance="outlined">
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="bodyStrong">{t('free.name')}</Text>
            <Text variant="body" tone="secondary">
              {t('free.body', { modules: config.free_module_count })}
            </Text>
          </View>
        </Card>

        <Divider />

        {/* Auto-renewal terms, stated on the screen rather than only in the store listing. */}
        <Text variant="caption" tone="secondary">
          {t('terms')}
        </Text>

        <View style={{ gap: theme.spacing.sm }}>
          <Button
            testID="paywall-restore"
            label={t('restore.action')}
            variant="secondary"
            icon="refresh"
            loading={isRestoring}
            onPress={restore}
            fullWidth
          />
          <Button
            testID="paywall-manage"
            label={t('manage')}
            variant="ghost"
            icon="open"
            // Hidden rather than pointed at a guess when there is no store to open.
            disabled={manageUrl === null}
            onPress={() => manageUrl && void Linking.openURL(manageUrl)}
            fullWidth
          />
        </View>

        {/* Terms (the EULA) and privacy, as both stores require on a subscription screen. */}
        <LegalLinks links={['terms', 'privacy']} />
      </ScrollView>
    </Screen>
  );
}

/** RevenueCat reports a cancelled purchase as a normal error with a flag. */
const isCancellation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { userCancelled?: unknown }).userCancelled === true;

const styles = StyleSheet.create({
  content: { paddingVertical: 16 },
});

import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import { Badge, Button, Card, Divider, Text } from '@/components/ui';
import { useEntitlements } from '@/features/paywall/hooks/useEntitlements';
import { useTheme } from '@/theme';

import { useManageSubscriptionUrl, useRestorePurchases } from '../hooks/useSubscription';
import { canUpgrade, subscriptionStatus } from '../logic/status';

/**
 * Subscription status and the two things a store requires next to it (SPEC §29, §31).
 *
 * **Restore purchases** must be reachable without going through the paywall: somebody
 * reinstalling the app has already paid and should not have to look at an offer to get back
 * what they own. **Manage subscription** goes wherever the store says, so cancelling is never
 * hidden — an app that makes cancelling hard gets a chargeback instead of a cancellation.
 *
 * The status comes from the SERVER's entitlements, so a purchase made on another device shows
 * up here too.
 */
export const SubscriptionCard = () => {
  const { t } = useTranslation('settings');
  const theme = useTheme();
  const router = useRouter();

  const { data: entitlements } = useEntitlements();
  const { restore, isRestoring } = useRestorePurchases();
  const manageUrl = useManageSubscriptionUrl();

  const status = subscriptionStatus(entitlements);

  return (
    <Card testID="subscription-settings">
      <View style={{ gap: theme.spacing.lg }}>
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="bodyStrong">{t('subscription.title')}</Text>

          <View style={{ alignItems: 'flex-start' }}>
            <Badge
              testID="subscription-plan"
              label={t(`subscription.plan.${status.plan}`)}
              tone={status.plan === 'free' ? 'neutral' : 'accent'}
              icon={status.plan === 'premium' ? 'star' : undefined}
            />
          </View>

          <Text variant="caption" tone="secondary">
            {describe(status, t)}
          </Text>
        </View>

        <Divider />

        <View style={{ gap: theme.spacing.sm }}>
          {canUpgrade(status) && (
            <Button
              testID="subscription-upgrade"
              label={t('subscription.upgrade')}
              icon="sparkles"
              onPress={() => router.push('/paywall?trigger=manual')}
              fullWidth
            />
          )}

          <Button
            testID="subscription-restore"
            label={t('subscription.restore')}
            variant="secondary"
            icon="refresh"
            loading={isRestoring}
            onPress={restore}
            fullWidth
          />

          {manageUrl !== null && (
            <Button
              testID="subscription-manage"
              label={t('subscription.manage')}
              variant="ghost"
              icon="open"
              onPress={() => void Linking.openURL(manageUrl)}
              fullWidth
            />
          )}
        </View>
      </View>
    </Card>
  );
};

/**
 * One honest line about what they hold.
 *
 * A lifetime purchase is never given a renewal date, and a plan that is ending says so rather
 * than saying "renews" — for somebody who has already cancelled, "renews on" would be a lie.
 */
const describe = (
  status: ReturnType<typeof subscriptionStatus>,
  t: (key: string, options?: Record<string, string>) => string,
): string => {
  if (status.plan === 'free') return t('subscription.none');
  if (status.isLifetime) return t('subscription.lifetime');
  // No date came back, so say the true thing rather than repeating the plan name that is
  // already on the badge right above this line.
  if (status.endsAt === null) return t('subscription.active');

  return t('subscription.renews', { date: formatDate(status.endsAt) });
};

/**
 * A date the learner recognises.
 *
 * Guarded: Hermes ships Intl, but a device with a broken zone database must not turn a
 * settings screen into a red one (SPEC §46). The ISO date is a poor fallback, not a crash.
 */
const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
};

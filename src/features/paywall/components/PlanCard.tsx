import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, Text } from '@/components/ui';
import { useTheme } from '@/theme';

import { formatMicros, needsNoAdsDisclaimer, purchaseAction, type Plan } from '../logic/plans';

export interface PlanCardProps {
  plan: Plan;
  savingPercent: number | null;
  onSelect: (plan: Plan) => void;
  busy: boolean;
}

/**
 * One plan on the paywall (SPEC §33).
 *
 * Everything on this card has to be true and complete: the localized price straight from the
 * store, the billing period, the per-month equivalent for an annual plan, and — for No Ads —
 * the plain statement that it does not unlock Premium lessons or unlimited lives. That last
 * one is the single most important sentence on the screen, because it is the thing a customer
 * is most likely to assume and most likely to ask for a refund over.
 *
 * What this card must never do (SPEC §33): pre-select itself, hide a cheaper option, count
 * down, or call a paid plan free.
 */
export const PlanCard = ({ plan, savingPercent, onSelect, busy }: PlanCardProps) => {
  const { t, i18n } = useTranslation('paywall');
  const theme = useTheme();

  const { product, role, state } = plan;
  const owned = state === 'owned' || state === 'superseded';

  return (
    <Card
      testID={`plan-${role}`}
      appearance={plan.recommended && !owned ? 'elevated' : 'outlined'}
      style={
        plan.recommended && !owned
          ? { borderWidth: 2, borderColor: theme.colors.primary }
          : undefined
      }
    >
      <View style={{ gap: theme.spacing.md }}>
        <View style={[styles.header, { gap: theme.spacing.sm }]}>
          <Text variant="bodyStrong" style={styles.title}>
            {t(`plans.${role}.name`)}
          </Text>
          {plan.recommended && !owned && <Badge label={t('recommended')} tone="accent" />}
          {savingPercent !== null && role === 'premium_annual' && (
            <Badge label={t('saving', { percent: savingPercent })} tone="success" />
          )}
        </View>

        {/* Straight from the store, already localized for the customer's country. */}
        <View style={[styles.price, { gap: theme.spacing.xs }]}>
          <Text variant="title">{product.localizedPrice}</Text>
          <Text variant="body" tone="secondary">
            {t(`period.${product.billingPeriod}`)}
          </Text>
        </View>

        {plan.monthlyEquivalentMicros !== null && (
          <Text variant="caption" tone="secondary">
            {t('perMonth', {
              price: formatMicros(
                plan.monthlyEquivalentMicros,
                product.currencyCode,
                i18n.language,
              ),
            })}
          </Text>
        )}

        <Text variant="body" tone="secondary">
          {t(`plans.${role}.body`)}
        </Text>

        {needsNoAdsDisclaimer(role) && (
          <Text testID="no-ads-disclaimer" variant="caption" tone="secondary">
            {t(`plans.${role}.limits`)}
          </Text>
        )}

        {owned ? (
          <Badge
            label={t(state === 'superseded' ? 'included' : 'owned')}
            tone="success"
            icon="checkmark-circle"
          />
        ) : (
          <Button
            testID={`plan-buy-${role}`}
            label={t(`action.${purchaseAction(state, product.billingPeriod)}`)}
            variant={plan.recommended ? 'primary' : 'secondary'}
            loading={busy}
            onPress={() => onSelect(plan)}
            fullWidth
          />
        )}

        {state === 'upgrade' && (
          <Text testID="upgrade-note" variant="caption" tone="secondary">
            {t('upgradeNote')}
          </Text>
        )}

        {/* A lifetime purchase cannot be replaced, so the customer is told plainly that this
            is a second charge and that what they already bought is not lost (SPEC §33). */}
        {state === 'add-on' && (
          <Text testID="add-on-note" variant="caption" tone="secondary">
            {t('addOnNote')}
          </Text>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  title: { flex: 1 },
  price: { flexDirection: 'row', alignItems: 'baseline' },
});

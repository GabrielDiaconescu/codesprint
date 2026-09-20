import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card, GameIcon, ProgressBar, Text } from '@/components/ui';
import { useTheme } from '@/theme';

interface GoalCardProps {
  earned: number;
  target: number;
  met: boolean;
}

/**
 * Today's goal, as XP (SPEC §11, §13).
 *
 * Minutes are chosen during onboarding but never measured — the goal is an XP target, and
 * saying so is more honest than a timer that does not exist.
 *
 * Meeting it changes the card rather than the caption: gold face, gold rim, a trophy. The
 * point of a daily goal is the moment it is met, and a screen that marks that moment with a
 * different sentence in the same grey box is not marking it.
 */
export const GoalCard = ({ earned, target, met }: GoalCardProps) => {
  const { t } = useTranslation('home');
  const theme = useTheme();

  const progress = target > 0 ? earned / target : 0;
  const goalText = t('goal.progress', { earned, target });

  return (
    <Card testID="goal-card" tone={met ? 'gold' : 'surface'}>
      <View style={{ gap: theme.spacing.md }}>
        <View style={[styles.row, { gap: theme.spacing.sm }]}>
          {met && <GameIcon name="trophy" size={26} />}
          <Text variant="heading" style={styles.flex}>
            {met ? t('goal.metTitle') : t('goal.title')}
          </Text>
        </View>

        <ProgressBar value={progress} tone={met ? 'gold' : 'success'} label={goalText} />

        <Text variant="bodySmall" tone={met ? 'primary' : 'secondary'}>
          {met ? t('goal.met') : goalText}
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});

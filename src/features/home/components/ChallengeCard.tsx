import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, GameIcon, Text } from '@/components/ui';
import { useTheme } from '@/theme';

import { RewardCoin } from './RewardCoin';

interface ChallengeCardProps {
  bonusXp: number;
  claimed: boolean;
  onPress: () => void;
}

/**
 * The Daily Challenge (SPEC §13, §24).
 *
 * The only warm card on the screen, and the only orange button. That is the whole reason it
 * has its own colour: Home already has a big blue "Continue", and a second blue button of
 * equal weight would read as the same action twice. Heat separates "the thing you do every
 * day" from "the extra thing you do today".
 *
 * Once claimed it stops selling — the coin becomes a tick, and the button goes quiet rather
 * than staying loud and disabled.
 */
export const ChallengeCard = ({ bonusXp, claimed, onPress }: ChallengeCardProps) => {
  const { t } = useTranslation('home');
  const theme = useTheme();

  return (
    <Card testID="challenge-card" tone="challenge">
      <View style={{ gap: theme.spacing.md }}>
        <View style={[styles.header, { gap: theme.spacing.md }]}>
          <View style={[styles.flex, { gap: theme.spacing.xs }]}>
            <View style={[styles.row, { gap: theme.spacing.sm }]}>
              <GameIcon name="bolt" size={26} />
              <Text variant="heading" style={styles.flex}>
                {t('challenge.title')}
              </Text>
            </View>
            <Text variant="caption" tone="secondary">
              {t('challenge.body')}
            </Text>
          </View>

          {claimed ? (
            <Badge
              testID="challenge-claimed"
              label={t('challenge.done')}
              tone="success"
              icon="checkmark-circle"
            />
          ) : (
            <RewardCoin
              testID="challenge-reward"
              label={t('challenge.reward', { count: bonusXp })}
            />
          )}
        </View>

        <Button
          testID="home-challenge"
          variant={claimed ? 'secondary' : 'challenge'}
          label={claimed ? t('challenge.done') : t('challenge.cta')}
          icon="flash"
          size="lg"
          onPress={onPress}
          disabled={claimed}
          fullWidth
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});

import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Badge, Card, Divider, GameIcon, ProgressBar, Text } from '@/components/ui';
import { useAppConfig } from '@/features/config/hooks/useAppConfig';
import { getLevelProgress } from '@/features/progress/logic/levels';
import { useTheme } from '@/theme';

import { formatScore } from '../logic/header';
import { LivesRow } from './LivesRow';

interface PlayerCardProps {
  xpTotal: number;
  streak: number;
  lives: { lives: number; max: number; unlimited: boolean };
}

const PUCK = 76;

/**
 * Who the learner is right now: level, XP, streak and lives (SPEC §13, §19–§22).
 *
 * The most prominent thing on Home after the lesson CTA, because it is the part people open
 * the app to look at. The level sits in a solid puck rather than a text line — a number in a
 * coloured disc reads as a rank, the same number in a paragraph reads as a statistic.
 *
 * The level is computed here from XP and the configured thresholds; the server never sends one
 * (SPEC §20), so the rule lives in exactly one place.
 */
export const PlayerCard = ({ xpTotal, streak, lives }: PlayerCardProps) => {
  const { t } = useTranslation('home');
  const { t: progressT } = useTranslation('progress');
  const { i18n } = useTranslation();
  const theme = useTheme();
  const { data: config } = useAppConfig();

  const level = getLevelProgress(xpTotal, config.level_thresholds);
  const levelProgressLabel = progressT('levelProgress', {
    current: level.xpIntoLevel,
    total: level.xpForNextLevel,
    next: level.level + 1,
  });

  return (
    <Card testID="player-card">
      <View style={{ gap: theme.spacing.lg }}>
        <View style={[styles.row, { gap: theme.spacing.lg }]}>
          <View
            style={[
              styles.puckRim,
              { backgroundColor: theme.colors.primaryDeep, top: theme.depth.raised },
            ]}
          />
          <View style={[styles.puck, { backgroundColor: theme.colors.primary }]}>
            <Text variant="label" style={{ color: theme.colors.onPrimary }}>
              {t('level.short')}
            </Text>
            <Text
              variant="score"
              style={{ color: theme.colors.onPrimary }}
              accessibilityLabel={progressT('level', { level: level.level })}
            >
              {level.level}
            </Text>
          </View>

          <View style={[styles.detail, { gap: theme.spacing.sm }]}>
            <View style={[styles.scoreRow, { gap: theme.spacing.sm }]}>
              <GameIcon name="coin" size={30} />
              <Text variant="score">{formatScore(xpTotal, i18n.language)}</Text>
              <Text variant="bodyStrong" tone="secondary">
                {t('xp')}
              </Text>
            </View>

            <ProgressBar value={level.progress} tone="accent" label={levelProgressLabel} />
            <Text variant="caption" tone="secondary">
              {levelProgressLabel}
            </Text>
          </View>
        </View>

        <Divider />

        <View style={[styles.footer, { gap: theme.spacing.lg }]}>
          <View style={[styles.scoreRow, { gap: theme.spacing.sm }]}>
            {/* Muted at zero: a grey flame says "not yet" without needing a second sentence. */}
            <GameIcon name="flame" size={30} muted={streak === 0} />
            <Text variant="bodyStrong">{progressT('stats.streakDays', { count: streak })}</Text>
          </View>

          {/* Lives are a Free / No Ads concept. Five hearts that can never go down are noise
              on the most important screen, so Premium gets a statement instead (SPEC §22). */}
          {lives.unlimited ? (
            <Badge testID="lives-unlimited" label={t('lives.unlimited')} tone="success" />
          ) : (
            <LivesRow lives={lives.lives} max={lives.max} />
          )}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  puckRim: {
    position: 'absolute',
    left: 0,
    width: PUCK,
    height: PUCK,
    borderRadius: PUCK / 2,
  },
  puck: {
    width: PUCK,
    height: PUCK,
    borderRadius: PUCK / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detail: { flex: 1 },
  scoreRow: { flexDirection: 'row', alignItems: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
});

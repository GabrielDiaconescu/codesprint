import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card, Icon, ProgressBar, ProgressRing, Text } from '@/components/ui';
import { useAppConfig } from '@/features/config/hooks/useAppConfig';
import { getLevelProgress } from '@/features/progress/logic/levels';
import { useTheme } from '@/theme';

interface LevelCardProps {
  xpTotal: number;
  streak?: number;
  compact?: boolean;
}

/**
 * XP and level (SPEC §19, §20).
 *
 * The level is computed here from XP and the configured thresholds — the server never sends
 * one (SPEC §20), so the rule lives in exactly one place.
 *
 * The ring shows progress through the current level rather than towards some final total: a
 * bar that creeps for a week is discouraging, one that fills every few lessons is not.
 */
export const LevelCard = ({ xpTotal, streak, compact = false }: LevelCardProps) => {
  const { t } = useTranslation('progress');
  const theme = useTheme();
  const { data: config } = useAppConfig();

  const level = getLevelProgress(xpTotal, config.level_thresholds);

  return (
    <Card testID="level-card">
      <View style={[styles.row, { gap: theme.spacing.lg }]}>
        <ProgressRing
          value={level.progress}
          size={compact ? 64 : 80}
          tone="accent"
          label={t('levelProgress', {
            current: level.xpIntoLevel,
            total: level.xpForNextLevel,
            next: level.level + 1,
          })}
        >
          <Text variant={compact ? 'subheading' : 'heading'}>{level.level}</Text>
        </ProgressRing>

        <View style={[styles.detail, { gap: theme.spacing.xs }]}>
          <Text variant="label" tone="secondary">
            {t('level', { level: level.level })}
          </Text>

          <View style={[styles.xpRow, { gap: theme.spacing.xs }]}>
            <Icon name="star" size="md" color={theme.colors.xp} />
            <Text variant="title">{xpTotal}</Text>
            <Text variant="body" tone="secondary">
              XP
            </Text>
          </View>

          <ProgressBar
            value={level.progress}
            tone="accent"
            label={t('levelProgress', {
              current: level.xpIntoLevel,
              total: level.xpForNextLevel,
              next: level.level + 1,
            })}
          />
          <Text variant="caption" tone="secondary">
            {t('levelProgress', {
              current: level.xpIntoLevel,
              total: level.xpForNextLevel,
              next: level.level + 1,
            })}
          </Text>

          {streak !== undefined && streak > 0 && (
            <View style={[styles.xpRow, { gap: theme.spacing.xs }]}>
              <Icon name="flame" size="sm" color={theme.colors.streak} />
              <Text variant="caption" tone="secondary">
                {t('stats.streakDays', { count: streak })}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  detail: { flex: 1 },
  xpRow: { flexDirection: 'row', alignItems: 'center' },
});

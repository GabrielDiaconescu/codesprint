import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { useTheme } from '@/theme';

interface LivesIndicatorProps {
  lives: number;
  max: number;
  unlimited: boolean;
  /** ISO timestamp for the next regeneration, or null. */
  nextLifeAt?: string | null;
  compact?: boolean;
}

/** How often the countdown is allowed to change, in milliseconds. */
const TICK_MS = 30_000;

const subscribe = (onChange: () => void) => {
  const timer = setInterval(onChange, TICK_MS);
  return () => clearInterval(timer);
};

/**
 * The current time, bucketed so it only "changes" twice a minute.
 *
 * `useSyncExternalStore` rather than state-in-an-effect: reading the clock during render is
 * impure, and this is the sanctioned place to read a value that changes outside React. The
 * bucketing keeps the snapshot stable between ticks, which is what the store contract needs.
 */
const useCoarseNow = (): number =>
  useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / TICK_MS),
    () => Math.floor(Date.now() / TICK_MS),
  ) * TICK_MS;

/**
 * Lives, and when the next one arrives (SPEC §22, §47).
 *
 * Hearts are drawn individually because a glance should be enough — but the whole row carries
 * one accessibility label saying the number in words, since counting five icons by ear is no
 * way to learn you are nearly out.
 *
 * The countdown is deliberately coarse: an exact second-by-second timer invites watching the
 * clock, which is the opposite of what the app is for.
 */
export const LivesIndicator = ({
  lives,
  max,
  unlimited,
  nextLifeAt,
  compact = false,
}: LivesIndicatorProps) => {
  const { t } = useTranslation('progress');
  const theme = useTheme();
  const now = useCoarseNow();

  const minutesAway =
    nextLifeAt === null || nextLifeAt === undefined
      ? null
      : Math.max(0, Math.round((new Date(nextLifeAt).getTime() - now) / 60_000));

  const countdown =
    minutesAway === null
      ? null
      : minutesAway >= 60
        ? t('lives.inHours', { count: Math.round(minutesAway / 60) })
        : t('lives.inMinutes', { count: Math.max(1, minutesAway) });

  if (unlimited) {
    return (
      <View
        style={[styles.row, { gap: theme.spacing.xs }]}
        accessible
        accessibilityLabel={t('lives.unlimited')}
      >
        <Icon name="heart" size={compact ? 'sm' : 'md'} color={theme.colors.life} />
        <Icon name="infinite" size={compact ? 'sm' : 'md'} color={theme.colors.life} />
      </View>
    );
  }

  return (
    <View
      style={[styles.row, { gap: theme.spacing.sm }]}
      accessible
      accessibilityLabel={
        countdown && lives < max
          ? `${t('lives.count', { count: lives, max })}. ${t('lives.next', { when: countdown })}`
          : t('lives.count', { count: lives, max })
      }
    >
      <View style={[styles.row, { gap: theme.spacing.xs }]}>
        {Array.from({ length: max }, (_, index) => (
          <Icon
            key={index}
            name={index < lives ? 'heart' : 'heart-outline'}
            size={compact ? 'sm' : 'md'}
            color={index < lives ? theme.colors.life : theme.colors.border}
          />
        ))}
      </View>

      {countdown && lives < max && (
        <Text variant="caption" tone="secondary">
          {countdown}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});

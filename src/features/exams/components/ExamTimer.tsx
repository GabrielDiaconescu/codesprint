import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { useTheme } from '@/theme';

import { formatRemaining, remainingMs, tickIntervalMs, timerTone } from '../logic/timer';

export interface ExamTimerProps {
  /** ISO timestamp from the server, or null for an exam with no time limit. */
  expiresAt: string | null;
  /** Fired once, when the clock reaches zero. */
  onExpired: () => void;
}

/**
 * The exam countdown (SPEC §27).
 *
 * The deadline belongs to the server — this only reads it. When it reaches zero the screen
 * submits, but so does the server if the device's clock is wrong or the app is asleep, so
 * nothing here is load-bearing for fairness.
 *
 * It ticks once a minute until the last five, then once a second. A 45-minute exam updating
 * every second is 2,700 re-renders of an otherwise static screen (SPEC §45), and nobody reads
 * the seconds while there is half an hour left.
 */
export const ExamTimer = ({ expiresAt, onExpired }: ExamTimerProps) => {
  const theme = useTheme();
  const { t } = useTranslation('exam');
  const [remaining, setRemaining] = useState(() => remainingMs(expiresAt, Date.now()));
  const fired = useRef(false);

  useEffect(() => {
    if (expiresAt === null) return;

    let timeout: ReturnType<typeof setTimeout>;

    const tick = () => {
      const next = remainingMs(expiresAt, Date.now());
      setRemaining(next);

      if (next === 0) {
        // Once only: the parent submits, and a second call mid-submission would race it.
        if (!fired.current) {
          fired.current = true;
          onExpired();
        }
        return;
      }

      timeout = setTimeout(tick, tickIntervalMs(next));
    };

    tick();
    return () => clearTimeout(timeout);
  }, [expiresAt, onExpired]);

  if (expiresAt === null || remaining === null) {
    return (
      <View style={[styles.root, { gap: theme.spacing.xs }]}>
        <Icon name="infinite" size="sm" color={theme.colors.textSecondary} />
        <Text variant="caption" tone="secondary">
          {t('timer.untimed')}
        </Text>
      </View>
    );
  }

  const tone = timerTone(remaining);
  const colour =
    tone === 'urgent'
      ? theme.colors.danger
      : tone === 'warning'
        ? theme.colors.warning
        : theme.colors.textSecondary;

  return (
    <View
      testID="exam-timer"
      accessible
      // Announced as time left, not as a bare clock reading, and re-read politely rather than
      // interrupting whatever the learner is being read (SPEC §47).
      accessibilityLabel={t('timer.accessibility', { time: formatRemaining(remaining) })}
      accessibilityLiveRegion={tone === 'urgent' ? 'polite' : 'none'}
      style={[styles.root, { gap: theme.spacing.xs }]}
    >
      <Icon name="time" size="sm" color={colour} />
      <Text variant="bodyStrong" style={{ color: colour }}>
        {formatRemaining(remaining)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center' },
});

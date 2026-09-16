import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReducedMotion, useTheme } from '@/theme';

export interface ProgressBarProps {
  /** 0–1. Values outside the range are clamped. */
  value: number;
  tone?: 'accent' | 'success' | 'streak';
  height?: number;
  /** Announced to screen readers, e.g. "Today's goal". */
  label?: string;
  testID?: string;
}

export const clampProgress = (value: number): number => {
  // NaN has no position on the scale, so it reads as "no progress"; the infinities clamp to
  // the end they point at, which Math.min/max already handle correctly.
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
};

/** Linear progress indicator (SPEC §8). Respects reduce-motion (SPEC §47). */
export const ProgressBar = ({
  value,
  tone = 'accent',
  height = 10,
  label,
  testID,
}: ProgressBarProps) => {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = clampProgress(value);
  const width = useSharedValue(progress);

  useEffect(() => {
    width.value = reduceMotion ? progress : withTiming(progress, { duration: theme.motion.normal });
  }, [progress, reduceMotion, theme.motion.normal, width]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));

  const tones = {
    accent: theme.colors.primary,
    success: theme.colors.success,
    streak: theme.colors.streak,
  } as const;

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: theme.colors.border },
      ]}
    >
      <Animated.View
        style={[styles.fill, { borderRadius: height / 2, backgroundColor: tones[tone] }, fillStyle]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
});

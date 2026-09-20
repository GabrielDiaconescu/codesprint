import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReducedMotion, useTheme } from '@/theme';

export type ProgressTone = 'accent' | 'success' | 'streak' | 'gold' | 'challenge';

export interface ProgressBarProps {
  /** 0–1. Values outside the range are clamped. */
  value: number;
  tone?: ProgressTone;
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

/**
 * A progress bar that looks like a filled tube (SPEC §8).
 *
 * Thick, fully rounded, with a soft highlight running along the top of the fill. The highlight
 * is the whole trick: a flat rectangle reads as a chart, the same rectangle with a lighter
 * strip near its top edge reads as a cylinder catching light.
 *
 * **On contrast.** The fills are bright by design, and a mid-bright fill cannot reach 3:1
 * against any track light enough to sit on a white card — that is arithmetic, not a choice.
 * WCAG 1.4.11 asks that the *component* be identifiable, which the track's outline does at
 * 3.7:1, and the *value* is never carried by colour alone: every bar in the app is rendered
 * next to a text label and exposes `accessibilityValue`, so a screen reader and a person who
 * cannot separate the two greens both get the number (SPEC §47).
 *
 * Respects reduce-motion.
 */
export const ProgressBar = ({
  value,
  tone = 'accent',
  height = 16,
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

  const tones: Record<ProgressTone, string> = {
    accent: theme.colors.primary,
    success: theme.colors.successFill,
    streak: theme.colors.streak,
    gold: theme.colors.xpGlow,
    challenge: theme.colors.challenge,
  };

  const radius = height / 2;
  // Enough of the tube to catch light, never so much that it washes the fill out.
  const highlightHeight = Math.max(3, Math.round(height * 0.26));

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={[
        styles.track,
        {
          height,
          borderRadius: radius,
          backgroundColor: theme.colors.border,
          borderColor: theme.colors.borderStrong,
        },
      ]}
    >
      <Animated.View
        style={[styles.fill, { borderRadius: radius, backgroundColor: tones[tone] }, fillStyle]}
      >
        <View
          style={[
            styles.highlight,
            {
              height: highlightHeight,
              top: Math.max(2, Math.round(height * 0.13)),
              borderRadius: highlightHeight / 2,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden', borderWidth: 2 },
  fill: { height: '100%', overflow: 'hidden' },
  // White at low alpha rather than a named colour, so one highlight works over every tone and
  // in both themes.
  highlight: {
    position: 'absolute',
    left: 6,
    right: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
});

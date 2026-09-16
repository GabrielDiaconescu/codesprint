import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/theme';

import { clampProgress } from './ProgressBar';

export interface ProgressRingProps {
  /** 0–1. Values outside the range are clamped. */
  value: number;
  size?: number;
  thickness?: number;
  tone?: 'accent' | 'success' | 'streak';
  /** Rendered in the middle of the ring (level number, percentage, icon). */
  children?: ReactNode;
  label?: string;
  testID?: string;
}

/**
 * Circular progress indicator (SPEC §8) — level progress, lesson completion, daily goal.
 *
 * Drawn with a stroke dash offset rather than an animated library, so it is cheap and static
 * by default; the caller animates `value` if it wants motion.
 */
export const ProgressRing = ({
  value,
  size = 72,
  thickness = 8,
  tone = 'accent',
  children,
  label,
  testID,
}: ProgressRingProps) => {
  const theme = useTheme();
  const progress = clampProgress(value);

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

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
      style={{ width: size, height: size }}
    >
      {/* Rotated so progress starts at 12 o'clock rather than 3 o'clock. */}
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.border}
          strokeWidth={thickness}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={tones[tone]}
          strokeWidth={thickness}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children ? <View style={styles.center}>{children}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  svg: { position: 'absolute' },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

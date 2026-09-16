import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * OS "reduce motion" preference (SPEC §8, §47).
 *
 * Every animation in the design system must consult this. When it is on, components render
 * their final state immediately instead of animating — they never simply animate faster.
 */
export const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduced(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduced;
};

/** Duration helper: collapses to 0 when the user asked for reduced motion. */
export const useMotionDuration = (duration: number): number => (useReducedMotion() ? 0 : duration);

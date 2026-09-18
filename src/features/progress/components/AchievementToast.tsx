import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Icon, Text, type IconName } from '@/components/ui';
import type { UnlockedAchievement } from '@/services';
import { useTheme } from '@/theme';
import { useReducedMotion } from '@/theme/useReducedMotion';

interface AchievementToastProps {
  achievement: UnlockedAchievement;
  /** The localized name, looked up by the caller from the catalogue. */
  name: string;
}

/**
 * The unlock celebration (SPEC §8, §25, §47).
 *
 * A short spring rather than a long animation: it should feel like a reward, not like a wait.
 * With reduce-motion on it appears in its final state immediately — never merely faster
 * (SPEC §8) — and either way the unlock is ANNOUNCED to a screen reader, because a purely
 * visual celebration is no celebration for someone who cannot see it.
 */
export const AchievementToast = ({ achievement, name }: AchievementToastProps) => {
  const { t } = useTranslation('progress');
  const theme = useTheme();
  const reducedMotion = useReducedMotion();

  const scale = useSharedValue(reducedMotion ? 1 : 0.6);
  const opacity = useSharedValue(reducedMotion ? 1 : 0);

  const announcement = t('achievements.unlockedAnnouncement', { name });

  useEffect(() => {
    if (!reducedMotion) {
      opacity.value = withTiming(1, { duration: theme.motion.fast });
      scale.value = withSequence(
        withSpring(1.06, { damping: 12, stiffness: 220 }),
        withSpring(1, { damping: 14, stiffness: 200 }),
      );
    }
    AccessibilityInfo.announceForAccessibility(announcement);
  }, [reducedMotion, opacity, scale, theme.motion.fast, announcement]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      testID={`achievement-${achievement.slug}`}
      accessibilityRole="alert"
      accessibilityLabel={announcement}
      style={[
        animatedStyle,
        styles.card,
        {
          backgroundColor: theme.colors.successSurface,
          borderColor: theme.colors.success,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.lg,
          gap: theme.spacing.md,
        },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: theme.colors.success }]}>
        <Icon name={achievement.icon_key as IconName} size="lg" color={theme.colors.textInverse} />
      </View>

      <View style={styles.text}>
        <Text variant="label" tone="success">
          {t('achievements.unlocked')}
        </Text>
        <Text variant="bodyStrong">{name}</Text>
        {achievement.xp_reward > 0 && (
          <Text variant="caption" tone="secondary">
            {t('achievements.reward', { count: achievement.xp_reward })}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth * 2 },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});

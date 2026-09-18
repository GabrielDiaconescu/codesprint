import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { Button, PlaceholderState, Screen, SkeletonLines } from '@/components/ui';
import { BackendStatusCard } from '@/features/config/components/BackendStatusCard';
import { LevelCard } from '@/features/progress/components/LevelCard';
import { useUserStats } from '@/features/progress/hooks/useProgress';
import { useTheme } from '@/theme';

/**
 * Home (SPEC §13).
 *
 * Phase 9 puts XP and level here, because the phase's whole point is that they visibly move.
 * Today's goal, the daily challenge and the next-lesson card are Phase 11, and the screen
 * says so rather than showing empty frames.
 */
export default function HomeScreen() {
  const { t } = useTranslation('home');
  const { t: progress } = useTranslation('progress');
  const theme = useTheme();
  const router = useRouter();

  const { data: stats, isPending } = useUserStats();

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.content, { gap: theme.spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {isPending ? (
          <SkeletonLines lines={3} />
        ) : (
          <LevelCard
            xpTotal={stats?.xp_total ?? 0}
            streak={stats?.current_streak}
            lives={
              stats
                ? {
                    lives: stats.lives,
                    max: stats.lives_max,
                    unlimited: stats.lives_unlimited,
                    nextLifeAt: stats.next_life_at,
                  }
                : undefined
            }
          />
        )}

        <Button
          testID="home-progress"
          variant="secondary"
          label={progress('open')}
          icon="stats-chart-outline"
          onPress={() => router.push('/progress')}
          fullWidth
        />

        <Button
          testID="home-learn"
          label={t('openLearn')}
          icon="book-outline"
          onPress={() => router.push('/learn')}
          fullWidth
        />

        <PlaceholderState title={t('placeholder.title')} body={t('placeholder.body')} />

        {/* Development-only proof that config comes from the database (SPEC §57, Phase 3).
            __DEV__ is false in every release build, so this never reaches a user. */}
        {__DEV__ && <BackendStatusCard />}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16 },
});

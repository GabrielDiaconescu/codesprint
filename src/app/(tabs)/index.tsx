import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, ProgressBar, Screen, SkeletonLines, StateView, Text } from '@/components/ui';
import { BackendStatusCard } from '@/features/config/components/BackendStatusCard';
import { ChallengeCard } from '@/features/home/components/ChallengeCard';
import { GoalCard } from '@/features/home/components/GoalCard';
import { HomeHeader } from '@/features/home/components/HomeHeader';
import { NextLessonCard } from '@/features/home/components/NextLessonCard';
import { PlayerCard } from '@/features/home/components/PlayerCard';
import { useHome } from '@/features/home/hooks/useHome';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { percent } from '@/features/progress/logic/levels';
import { useTheme } from '@/theme';

/**
 * Home (SPEC §13).
 *
 * The most important screen in the product: a learner must open it and immediately know what
 * to do next. Everything comes from one RPC, so there is one loading state rather than five,
 * and a brand-new learner sees an invitation rather than a wall of zeroes.
 *
 * The order is the argument. Who you are (level, XP, streak, lives), how today is going
 * (goal), the one thing to do now (next lesson), the extra thing (challenge), then the slower
 * context — course progress and practice. Nothing below the challenge is something a learner
 * has to read to start.
 */
export default function HomeScreen() {
  const { t } = useTranslation('home');
  const { t: common } = useTranslation('common');
  const { t: progressT } = useTranslation('progress');
  const theme = useTheme();
  const router = useRouter();

  const { data, isPending, isError, refetch } = useHome();
  // Separate query, and deliberately not awaited: a greeting is not worth delaying the screen
  // for, and `greeting()` already has a name-free form for exactly this frame.
  const { data: profile } = useProfile();

  if (isPending) {
    return (
      <Screen>
        <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.lg }}>
          <SkeletonLines lines={3} />
          <SkeletonLines lines={3} />
          <SkeletonLines lines={2} />
        </View>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <View style={styles.centre}>
          <StateView
            icon="cloud-offline"
            tone="danger"
            title={t('error.title')}
            body={t('error.body')}
            actionLabel={common('actions.retry')}
            onAction={() => void refetch()}
          />
        </View>
      </Screen>
    );
  }

  const courseText = t('course.progress', {
    completed: data.course.completed,
    total: data.course.total,
  });

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.content, { gap: theme.spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader displayName={profile?.displayName} />

        <PlayerCard
          xpTotal={data.xp_total}
          streak={data.current_streak}
          lives={{
            lives: data.lives.lives,
            max: data.lives.max,
            unlimited: data.lives.unlimited,
          }}
        />

        <GoalCard
          earned={data.daily_goal.earned_xp}
          target={data.daily_goal.target_xp}
          met={data.daily_goal.met}
        />

        {data.next_lesson ? (
          <NextLessonCard
            title={data.next_lesson.title}
            moduleTitle={data.next_lesson.module_title}
            estimatedMinutes={data.next_lesson.estimated_minutes}
            isNew={data.is_new}
            onPress={() => {
              const next = data.next_lesson;
              if (next) router.push({ pathname: '/lesson/[id]', params: { id: next.id } });
            }}
          />
        ) : (
          <Card testID="all-done-card" appearance="outlined">
            <View style={{ gap: theme.spacing.sm }}>
              <Text variant="heading">{t('allDoneTitle')}</Text>
              <Text variant="bodySmall" tone="secondary">
                {t('allDoneBody')}
              </Text>
            </View>
          </Card>
        )}

        <ChallengeCard
          bonusXp={data.challenge.bonus_xp}
          claimed={data.challenge.claimed}
          onPress={() => router.push('/challenge')}
        />

        <Card appearance="outlined">
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="heading">{t('course.title')}</Text>
            <ProgressBar
              value={data.course.total > 0 ? data.course.completed / data.course.total : 0}
              tone="success"
              label={courseText}
            />
            <Text variant="caption" tone="secondary">
              {courseText} · {percent(data.course.completed, data.course.total)}%
            </Text>
          </View>
        </Card>

        {/* Practice (SPEC §23). Review is offered only when there is something to review. */}
        <Card appearance="outlined">
          <View style={{ gap: theme.spacing.md }}>
            <View style={{ gap: theme.spacing.xs }}>
              <Text variant="heading">{t('practice.title')}</Text>
              <Text variant="caption" tone="secondary">
                {data.mistake_count > 0
                  ? t('practice.body', { count: data.mistake_count })
                  : t('practice.none')}
              </Text>
            </View>

            <Button
              testID="home-practice"
              variant="secondary"
              label={t('practice.cta')}
              icon="refresh"
              onPress={() => router.push({ pathname: '/practice', params: { mode: 'review' } })}
              disabled={data.mistake_count === 0}
              fullWidth
            />

            <Button
              testID="home-practice-mixed"
              variant="ghost"
              label={t('practice.mixed')}
              onPress={() => router.push({ pathname: '/practice', params: { mode: 'mixed' } })}
              fullWidth
            />
          </View>
        </Card>

        <Button
          testID="home-progress"
          variant="ghost"
          label={progressT('open')}
          icon="stats-chart"
          onPress={() => router.push('/progress')}
          fullWidth
        />

        {/* Development-only proof that config comes from the database (SPEC §57, Phase 3).
            __DEV__ is false in every release build, so this never reaches a user. */}
        {__DEV__ && <BackendStatusCard />}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingVertical: 16, paddingBottom: 32 },
});

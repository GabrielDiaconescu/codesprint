import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  Icon,
  ProgressBar,
  Screen,
  SkeletonLines,
  StateView,
  Text,
} from '@/components/ui';
import { BackendStatusCard } from '@/features/config/components/BackendStatusCard';
import { useHome } from '@/features/home/hooks/useHome';
import { LevelCard } from '@/features/progress/components/LevelCard';
import { percent } from '@/features/progress/logic/levels';
import { useTheme } from '@/theme';

/**
 * Home (SPEC §13).
 *
 * The most important screen in the product: a learner must open it and immediately know what
 * to do next. Everything comes from one RPC, so there is one loading state rather than five,
 * and a brand-new learner sees an invitation rather than a wall of zeroes.
 */
export default function HomeScreen() {
  const { t } = useTranslation('home');
  const { t: common } = useTranslation('common');
  const { t: progressT } = useTranslation('progress');
  const theme = useTheme();
  const router = useRouter();

  const { data, isPending, isError, refetch } = useHome();

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
            icon="cloud-offline-outline"
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

  const goalProgress =
    data.daily_goal.target_xp > 0 ? data.daily_goal.earned_xp / data.daily_goal.target_xp : 0;
  const goalText = t('goal.progress', {
    earned: data.daily_goal.earned_xp,
    target: data.daily_goal.target_xp,
  });
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
        <Text variant="title" accessibilityRole="header">
          {data.is_new ? t('greetingNew') : t('greetingBack')}
        </Text>

        <LevelCard
          xpTotal={data.xp_total}
          streak={data.current_streak}
          lives={{
            lives: data.lives.lives,
            max: data.lives.max,
            unlimited: data.lives.unlimited,
            nextLifeAt: data.lives.next_life_at,
          }}
        />

        {/* Today's goal, as XP. Minutes are chosen but never measured (SPEC §11). */}
        <Card appearance="outlined">
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="subheading">{t('goal.title')}</Text>
            <ProgressBar
              value={goalProgress}
              tone={data.daily_goal.met ? 'success' : 'accent'}
              label={goalText}
            />
            <Text variant="caption" tone={data.daily_goal.met ? 'success' : 'secondary'}>
              {data.daily_goal.met ? t('goal.met') : goalText}
            </Text>
          </View>
        </Card>

        {/* The primary call to action. A new learner gets an invitation, not a resume button. */}
        {data.next_lesson ? (
          <Card>
            <View style={{ gap: theme.spacing.md }}>
              <Text variant="label" tone="secondary">
                {data.is_new ? t('startFirst') : t('continueTitle')}
              </Text>
              <Text variant="heading">{data.next_lesson.title}</Text>

              <View style={[styles.row, { gap: theme.spacing.sm }]}>
                <Icon name="book-outline" size="sm" color={theme.colors.textSecondary} />
                <Text variant="caption" tone="secondary">
                  {data.next_lesson.module_title}
                </Text>
              </View>

              <Button
                testID="home-continue"
                label={data.is_new ? t('startCta') : t('continueCta')}
                icon="play"
                onPress={() => {
                  const next = data.next_lesson;
                  if (next) router.push({ pathname: '/lesson/[id]', params: { id: next.id } });
                }}
                fullWidth
              />
            </View>
          </Card>
        ) : (
          <Card appearance="outlined">
            <View style={{ gap: theme.spacing.sm }}>
              <Text variant="subheading">{t('allDoneTitle')}</Text>
              <Text variant="bodySmall" tone="secondary">
                {t('allDoneBody')}
              </Text>
            </View>
          </Card>
        )}

        {/* Daily Challenge (SPEC §24). */}
        <Card appearance="outlined">
          <View style={{ gap: theme.spacing.md }}>
            <View style={[styles.rowBetween, { gap: theme.spacing.sm }]}>
              <View style={[styles.flex, { gap: theme.spacing.xs }]}>
                <Text variant="subheading">{t('challenge.title')}</Text>
                <Text variant="caption" tone="secondary">
                  {t('challenge.body')}
                </Text>
              </View>

              {data.challenge.claimed ? (
                <Badge label={t('challenge.done')} tone="success" icon="checkmark" />
              ) : (
                <Badge
                  label={t('challenge.reward', { count: data.challenge.bonus_xp })}
                  tone="xp"
                  icon="star"
                />
              )}
            </View>

            <Button
              testID="home-challenge"
              variant={data.challenge.claimed ? 'secondary' : 'primary'}
              label={data.challenge.claimed ? t('challenge.done') : t('challenge.cta')}
              icon="flash"
              onPress={() => router.push('/challenge')}
              disabled={data.challenge.claimed}
              fullWidth
            />
          </View>
        </Card>

        <Card appearance="outlined">
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="subheading">{t('course.title')}</Text>
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
              <Text variant="subheading">{t('practice.title')}</Text>
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
            />
          </View>
        </Card>

        <Button
          testID="home-progress"
          variant="ghost"
          label={progressT('open')}
          icon="stats-chart-outline"
          onPress={() => router.push('/progress')}
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
  content: { paddingVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
});

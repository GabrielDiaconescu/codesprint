import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  Badge,
  Card,
  Divider,
  Icon,
  ProgressBar,
  Screen,
  SkeletonLines,
  StateView,
  Text,
} from '@/components/ui';
import { AchievementList } from '@/features/progress/components/AchievementList';
import { LevelCard } from '@/features/progress/components/LevelCard';
import { useAchievements } from '@/features/progress/hooks/useAchievements';
import { useProgressSummary } from '@/features/progress/hooks/useProgress';
import { percent } from '@/features/progress/logic/levels';
import type { SkillProgress } from '@/services';
import { useTheme } from '@/theme';

/**
 * The Progress screen (SPEC §28).
 *
 * One RPC for the whole screen. Per-skill accuracy is Premium and is simply absent from a
 * free user's response — the upsell explains what it is rather than showing a blurred number,
 * because pretending the data is there and hiding it is the dishonest version.
 */
export default function ProgressScreen() {
  const { t } = useTranslation('progress');
  const { t: common } = useTranslation('common');
  const theme = useTheme();

  const { data, isPending, isError, refetch } = useProgressSummary();
  const achievements = useAchievements();

  if (isPending) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('title') }} />
        <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.lg }}>
          <SkeletonLines lines={3} />
          <SkeletonLines lines={4} />
          <SkeletonLines lines={4} />
        </View>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('title') }} />
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

  const accuracy = percent(data.questions_correct, data.questions_answered);

  return (
    <Screen>
      <Stack.Screen options={{ title: t('title') }} />

      <ScrollView
        contentContainerStyle={[styles.content, { gap: theme.spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <LevelCard xpTotal={data.xp_total} streak={data.current_streak} />

        {data.current_streak === 0 && (
          <Text variant="caption" tone="secondary" style={styles.pending}>
            {t('streakBroken')}
          </Text>
        )}

        {/* The four headline numbers, each with its own label — no icon-only tiles. */}
        <Card appearance="outlined">
          <View style={styles.statsRow}>
            <Stat label={t('stats.lessons')} value={String(data.lessons_completed)} icon="book" />
            <Stat
              label={t('stats.questions')}
              value={String(data.questions_answered)}
              icon="help-circle"
            />
            <Stat label={t('stats.accuracy')} value={`${accuracy}%`} icon="checkmark-circle" />
            <Stat
              label={t('stats.streak')}
              value={t('stats.streakDays', { count: data.current_streak })}
              icon="flame"
            />
          </View>
        </Card>

        <Card appearance="outlined">
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="subheading">{t('course.title')}</Text>
            <ProgressBar
              value={
                data.lessons_total > 0 ? data.lessons_completed_unlocked / data.lessons_total : 0
              }
              tone="success"
              label={t('course.lessons', {
                completed: data.lessons_completed_unlocked,
                total: data.lessons_total,
              })}
            />
            <Text variant="caption" tone="secondary">
              {t('course.lessons', {
                completed: data.lessons_completed_unlocked,
                total: data.lessons_total,
              })}
            </Text>
          </View>
        </Card>

        <Card appearance="outlined">
          <View style={{ gap: theme.spacing.md }}>
            <Text variant="subheading">{t('modules.title')}</Text>
            {data.modules.map((module) => (
              <View key={module.id} style={{ gap: theme.spacing.xs }}>
                <View style={[styles.moduleHeader, { gap: theme.spacing.sm }]}>
                  <Text variant="bodySmall" style={styles.flex} numberOfLines={1}>
                    {module.title}
                  </Text>
                  {!module.is_unlocked && (
                    <Badge label={t('modules.locked')} tone="neutral" icon="lock-closed" />
                  )}
                  <Text variant="caption" tone="secondary">
                    {t('modules.lessons', {
                      completed: module.completed_count,
                      total: module.lesson_count,
                    })}
                  </Text>
                </View>
                <ProgressBar
                  value={module.lesson_count > 0 ? module.completed_count / module.lesson_count : 0}
                  label={`${module.title}. ${t('modules.lessons', { completed: module.completed_count, total: module.lesson_count })}`}
                />
              </View>
            ))}
          </View>
        </Card>

        <Card appearance="outlined">
          <View style={{ gap: theme.spacing.md }}>
            <View style={{ gap: theme.spacing.xs }}>
              <Text variant="subheading">{t('skills.title')}</Text>
              <Text variant="caption" tone="secondary">
                {t('skills.body')}
              </Text>
            </View>

            {data.skills.map((skill) => (
              <SkillRow key={skill.tag} skill={skill} />
            ))}

            {!data.is_premium && (
              <>
                <Divider />
                <View style={[styles.upsell, { gap: theme.spacing.sm }]}>
                  <Icon name="sparkles" size="md" color={theme.colors.primary} />
                  <View style={[styles.flex, { gap: theme.spacing.xs }]}>
                    <Text variant="bodyStrong">{t('skills.premiumTitle')}</Text>
                    <Text variant="caption" tone="secondary">
                      {t('skills.premiumBody')}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </Card>

        <Card appearance="outlined">
          <View style={{ gap: theme.spacing.md }}>
            <View style={[styles.moduleHeader, { gap: theme.spacing.sm }]}>
              <Text variant="subheading" style={styles.flex}>
                {t('achievements.title')}
              </Text>
              <Text variant="caption" tone="secondary">
                {t('achievements.count', {
                  unlocked: data.achievements.unlocked,
                  total: data.achievements.total,
                })}
              </Text>
            </View>

            {achievements.isPending ? (
              <SkeletonLines lines={3} />
            ) : achievements.isError ? (
              <Text variant="caption" tone="danger">
                {t('achievements.error')}
              </Text>
            ) : (
              <AchievementList achievements={achievements.data ?? []} />
            )}
          </View>
        </Card>

        <Text variant="caption" tone="secondary" style={styles.pending}>
          {t('pending')}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const Stat = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: 'book' | 'help-circle' | 'checkmark-circle' | 'flame';
}) => {
  const theme = useTheme();
  return (
    <View
      style={[styles.stat, { gap: theme.spacing.xs }]}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Icon name={icon} size="md" color={theme.colors.textSecondary} />
      <Text variant="bodyStrong">{value}</Text>
      <Text variant="caption" tone="secondary" align="center">
        {label}
      </Text>
    </View>
  );
};

const SkillRow = ({ skill }: { skill: SkillProgress }) => {
  const { t } = useTranslation('progress');
  const theme = useTheme();

  const mastery = percent(skill.mastered_count, skill.question_count);
  // Premium-only: absent from a free user's response entirely, not hidden here.
  const hasAccuracy = skill.attempts !== null && skill.attempts > 0;

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <View style={[styles.moduleHeader, { gap: theme.spacing.sm }]}>
        <Text variant="bodySmall" style={styles.flex}>
          {skill.tag}
        </Text>
        <Text variant="caption" tone="secondary">
          {mastery}%
        </Text>
      </View>
      <ProgressBar
        value={mastery / 100}
        tone={mastery === 0 ? 'accent' : 'success'}
        label={`${skill.tag}: ${mastery}%`}
      />
      {hasAccuracy && (
        <Text variant="caption" tone="secondary">
          {t('skills.accuracy', { correct: skill.correct_attempts, attempts: skill.attempts })}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingVertical: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { flex: 1, alignItems: 'center' },
  moduleHeader: { flexDirection: 'row', alignItems: 'center' },
  upsell: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
  pending: { textAlign: 'center' },
});

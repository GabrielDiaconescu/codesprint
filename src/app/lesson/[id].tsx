import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, ProgressBar, Screen, SkeletonLines, StateView, Text } from '@/components/ui';
import { LessonBlockView } from '@/features/lesson/components/LessonBlocks';
import { QuestionPage } from '@/features/lesson/components/QuestionPage';
import { AchievementToast } from '@/features/progress/components/AchievementToast';
import { useAchievements } from '@/features/progress/hooks/useAchievements';
import { useLesson } from '@/features/lesson/hooks/useLesson';
import { useCompleteLesson } from '@/features/progress/hooks/useProgress';
import { buildLessonPages, countQuestions, pageProgress } from '@/features/lesson/logic/pages';
import { LessonUnavailableError, type AnswerResult, type LessonErrorReason } from '@/services';
import { useTheme } from '@/theme';

/**
 * The lesson player (SPEC §15, §18).
 *
 * A full-screen route outside the tabs, so there is no tab bar and no banner ad while
 * learning (SPEC §10, §30).
 *
 * The lesson is a sequence of pages: runs of explanation, then one question at a time.
 * Progress is the page index — a thing that can be unit-tested — rather than a scroll
 * position. Each answer is graded on the server before the learner can continue, and the
 * running tally shown at the end is the sum of what the server actually awarded.
 */
export default function LessonScreen() {
  const { t } = useTranslation('lesson');
  const { t: common } = useTranslation('common');
  const theme = useTheme();
  const router = useRouter();

  const params = useLocalSearchParams<{ id?: string }>();
  const lessonId = typeof params.id === 'string' ? params.id : undefined;

  const { data: lesson, isPending, isError, error, refetch } = useLesson(lessonId);

  const pages = useMemo(() => buildLessonPages(lesson?.blocks ?? []), [lesson]);
  const questionTotal = useMemo(() => countQuestions(pages), [pages]);

  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<AnswerResult[]>([]);
  const [finished, setFinished] = useState(false);

  const completeLesson = useCompleteLesson();

  // The catalogue is only needed to put a NAME on an unlock: the RPC returns ids and icons,
  // and the localized names live in one place rather than being duplicated into the response.
  const { data: catalogue } = useAchievements();
  const nameFor = (slug: string) => catalogue?.find((entry) => entry.slug === slug)?.name ?? slug;

  // Everything unlocked during this lesson — by an answer or by finishing it.
  const unlocked = [
    ...results.flatMap((result) => result.unlocked),
    ...(completeLesson.data?.unlocked ?? []),
  ];

  const advance = () => {
    if (index + 1 >= pages.length) {
      // The server decides what completing is worth. It is idempotent, so a second call
      // after a dropped response pays nothing rather than paying twice.
      if (lessonId && !completeLesson.isPending && !completeLesson.isSuccess) {
        completeLesson.mutate({ lessonId });
      }
      setFinished(true);
    } else {
      setIndex(index + 1);
    }
  };

  if (isPending) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.lg }}>
          <SkeletonLines lines={3} />
          <SkeletonLines lines={4} />
          <SkeletonLines lines={3} />
        </View>
      </Screen>
    );
  }

  if (isError) {
    const reason: LessonErrorReason =
      error instanceof LessonUnavailableError ? error.reason : 'unknown';

    const presentation = {
      'requires-premium': {
        icon: 'lock-closed' as const,
        title: t('error.premiumTitle'),
        body: t('error.premiumBody'),
        action: t('error.back'),
        onAction: () => router.back(),
      },
      'not-found': {
        icon: 'help-circle-outline' as const,
        title: t('error.notFoundTitle'),
        body: t('error.notFoundBody'),
        action: t('error.back'),
        onAction: () => router.back(),
      },
      unknown: {
        icon: 'cloud-offline-outline' as const,
        title: t('error.unknownTitle'),
        body: t('error.unknownBody'),
        action: common('actions.retry'),
        onAction: () => void refetch(),
      },
    }[reason];

    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <View style={styles.centre}>
          <StateView
            testID={`lesson-error-${reason}`}
            icon={presentation.icon}
            tone={reason === 'unknown' ? 'danger' : 'neutral'}
            title={presentation.title}
            body={presentation.body}
            actionLabel={presentation.action}
            onAction={presentation.onAction}
          />
        </View>
      </Screen>
    );
  }

  if (finished || pages.length === 0) {
    // Question XP from the answers, plus whatever the server paid for completing the lesson.
    const questionXp = results.reduce((sum, r) => sum + r.xp_awarded, 0);
    const xpEarned = questionXp + (completeLesson.data?.xp_awarded ?? 0);
    const firstTryCorrect = completeLesson.data?.first_try_correct ?? 0;

    return (
      <Screen>
        <Stack.Screen options={{ title: lesson.title }} />
        <ScrollView
          contentContainerStyle={[styles.completeContent, { gap: theme.spacing.md }]}
          showsVerticalScrollIndicator={false}
        >
          <StateView
            testID="lesson-complete"
            icon="checkmark-circle"
            title={t('complete.title')}
            body={t('complete.body', { title: lesson.title })}
            actionLabel={t('complete.backToModule')}
            onAction={() => router.back()}
          />
          {questionTotal > 0 && (
            <Text variant="bodyStrong" align="center">
              {t('complete.score', { correct: firstTryCorrect, total: questionTotal })}
            </Text>
          )}
          {xpEarned > 0 && (
            <Text variant="bodyStrong" tone="accent" align="center">
              {t('complete.xpEarned', { count: xpEarned })}
            </Text>
          )}
          {completeLesson.data?.is_perfect && (
            <Text variant="bodyStrong" tone="success" align="center">
              {t('complete.perfect')}
            </Text>
          )}
          {(completeLesson.data?.current_streak ?? 0) > 0 && (
            <Text variant="bodyStrong" tone="accent" align="center">
              {t('complete.streak', { count: completeLesson.data!.current_streak })}
            </Text>
          )}

          {unlocked.map((achievement) => (
            <AchievementToast
              key={achievement.id}
              achievement={achievement}
              name={nameFor(achievement.slug)}
            />
          ))}
          <Text variant="caption" tone="secondary" style={styles.pendingNote}>
            {t('complete.xpPending')}
          </Text>
        </ScrollView>
      </Screen>
    );
  }

  const page = pages[index]!;

  return (
    <Screen>
      <Stack.Screen options={{ title: lesson.module.title }} />

      <View style={{ paddingTop: theme.spacing.sm }}>
        <ProgressBar
          value={pageProgress(index, pages.length)}
          label={t('progress', { percent: Math.round(pageProgress(index, pages.length) * 100) })}
        />
      </View>

      <ScrollView
        testID="lesson-scroll"
        contentContainerStyle={[styles.content, { gap: theme.spacing.lg }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {page.kind === 'reading' ? (
          <>
            {index === 0 && (
              <View style={{ gap: theme.spacing.xs }}>
                <Text variant="title" accessibilityRole="header">
                  {lesson.title}
                </Text>
                {lesson.summary.length > 0 && (
                  <Text variant="body" tone="secondary">
                    {lesson.summary}
                  </Text>
                )}
              </View>
            )}

            {page.blocks.map((block, blockIndex) => (
              <LessonBlockView key={blockIndex} block={block} />
            ))}

            <Button
              testID="lesson-continue"
              label={index + 1 >= pages.length ? t('finish') : t('question.continue')}
              onPress={advance}
              fullWidth
            />
          </>
        ) : (
          // Keyed by question id so moving to the next question resets its state entirely.
          <QuestionPage
            key={page.question.id}
            question={page.question}
            number={page.number}
            total={questionTotal}
            onContinue={(result) => {
              setResults((previous) => [...previous, result]);
              advance();
            }}
            onSkip={advance}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingVertical: 16, flexGrow: 1 },
  completeContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  pendingNote: { textAlign: 'center', paddingHorizontal: 24 },
});

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Screen, SkeletonLines, StateView } from '@/components/ui';
import { ExamResultsView } from '@/features/exams/components/ExamResultsView';
import { ExamReview } from '@/features/exams/components/ExamReview';
import { ExamRunner } from '@/features/exams/components/ExamRunner';
import { useCapture } from '@/features/analytics/hooks/useAnalytics';
import { useStartExam, useSubmitExam } from '@/features/exams/hooks/useExams';
import { ExamUnavailable, type ExamPaper, type ExamResults } from '@/services';
import { useTheme } from '@/theme';

type Stage = 'sitting' | 'results' | 'review';

/**
 * Sitting one exam, start to finish (SPEC §27).
 *
 * Three stages behind one route, because they are one continuous act from the learner's point
 * of view and because a results page that lives at its own URL would be reachable — and
 * reloadable — without the attempt that produced it.
 *
 * The exam is started by an effect rather than on the previous screen's tap, so that a
 * refusal (paywall, weekly limit, cooldown) lands here with somewhere to put the explanation
 * rather than as a toast over the list.
 */
export default function ExamScreen() {
  const { t } = useTranslation('exam');
  const { t: common } = useTranslation('common');
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; title?: string }>();

  const capture = useCapture();

  const start = useStartExam();
  const submit = useSubmitExam();

  const [paper, setPaper] = useState<ExamPaper | null>(null);
  const [results, setResults] = useState<ExamResults | null>(null);
  const [stage, setStage] = useState<Stage>('sitting');

  const { mutate: startExam } = start;

  useEffect(() => {
    if (!params.id) return;
    startExam(params.id, {
      onSuccess: (paper) => {
        setPaper(paper);
        capture('exam_started', { resumed: paper.resumed, questions: paper.question_count });
      },
    });
    // Once per exam. A second call would be harmless — an open attempt is resumed — but it
    // would also restart the clock display for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const title = params.title ?? paper?.title ?? t('title');

  if (start.isError) {
    const reason = start.error instanceof ExamUnavailable ? start.error.reason : 'unknown';

    return (
      <Screen>
        <Stack.Screen options={{ title }} />
        <StateView
          testID={`exam-unavailable-${reason}`}
          icon={reason === 'requires_premium' ? 'lock-closed' : 'information-circle-outline'}
          title={t(`locked.${reason}Title`)}
          body={t(`locked.${reason}`)}
          actionLabel={common('actions.close')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  if (!paper) {
    return (
      <Screen>
        <Stack.Screen options={{ title }} />
        <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.lg }}>
          <SkeletonLines lines={3} />
          <SkeletonLines lines={5} />
        </View>
      </Screen>
    );
  }

  if (stage === 'review' && results) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('review.title') }} />
        <ExamReview results={results} onClose={() => setStage('results')} />
      </Screen>
    );
  }

  if (stage === 'results' && results) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('results.title'), headerBackVisible: false }} />
        <ExamResultsView
          results={results}
          onReview={() => setStage('review')}
          onClose={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      {/* No back button while an exam is running: leaving is "hand in", not "undo". The clock
          keeps running server-side either way, so a stray swipe should not look like an exit. */}
      <Stack.Screen options={{ title, headerBackVisible: false, gestureEnabled: false }} />
      <View style={styles.root}>
        <ExamRunner
          // Keyed by attempt, so a different paper gets a fresh runner rather than the
          // previous one's answers and position.
          key={paper.attempt_id}
          paper={paper}
          submitting={submit.isPending}
          onSubmit={(answers) =>
            submit.mutate(
              { attemptId: paper.attempt_id, answers },
              {
                onSuccess: (graded) => {
                  setResults(graded);
                  setStage('results');
                  capture('exam_completed', {
                    passed: graded.passed,
                    score_pct: Math.round(graded.score_pct),
                  });
                },
              },
            )
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Screen, SkeletonLines, StateView, Text } from '@/components/ui';
import { usePracticeSet } from '@/features/home/hooks/useHome';
import { QuestionRunner } from '@/features/practice/components/QuestionRunner';
import { LessonUnavailableError, type AnswerResult, type PracticeMode } from '@/services';
import { useTheme } from '@/theme';

/**
 * Practice (SPEC §23).
 *
 * Three modes behind one screen. Full-screen and outside the tabs, like a lesson: no tab bar
 * and no banner ad while answering (SPEC §10, §30).
 *
 * Answers are graded in `practice` context, so they pay the flat practice rate under the
 * daily cap rather than lesson XP, and a wrong answer costs a life exactly as it would in a
 * lesson (SPEC §19, §22).
 */
export default function PracticeScreen() {
  const { t } = useTranslation('practice');
  const { t: common } = useTranslation('common');
  const theme = useTheme();
  const router = useRouter();

  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: PracticeMode =
    params.mode === 'mixed' || params.mode === 'hard' ? params.mode : 'review';

  const { data, isPending, isError, error, refetch } = usePracticeSet(mode);
  const [results, setResults] = useState<AnswerResult[] | null>(null);

  if (isPending) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t(`modes.${mode}`) }} />
        <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.lg }}>
          <SkeletonLines lines={3} />
          <SkeletonLines lines={4} />
        </View>
      </Screen>
    );
  }

  if (isError) {
    const premium = error instanceof LessonUnavailableError && error.reason === 'requires-premium';

    return (
      <Screen>
        <Stack.Screen options={{ title: t(`modes.${mode}`) }} />
        <View style={styles.centre}>
          <StateView
            testID={premium ? 'practice-premium' : 'practice-error'}
            icon={premium ? 'lock-closed' : 'cloud-offline'}
            tone={premium ? 'neutral' : 'danger'}
            title={premium ? t('premium.title') : t('error.title')}
            body={premium ? t('premium.body') : t('error.body')}
            actionLabel={premium ? common('actions.close') : common('actions.retry')}
            onAction={premium ? () => router.back() : () => void refetch()}
          />
        </View>
      </Screen>
    );
  }

  if (data.questions.length === 0) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t(`modes.${mode}`) }} />
        <View style={styles.centre}>
          <StateView
            testID="practice-empty"
            icon="checkmark-circle"
            title={t(`empty.${mode}Title`)}
            body={t(`empty.${mode}Body`)}
            actionLabel={common('actions.close')}
            onAction={() => router.back()}
          />
        </View>
      </Screen>
    );
  }

  if (results) {
    const correct = results.filter((result) => result.correct).length;
    const xp = results.reduce((sum, result) => sum + result.xp_awarded, 0);
    // Answers kept counting for the streak; only the XP stopped (SPEC §19).
    const capped = correct > 0 && xp === 0;

    return (
      <Screen>
        <Stack.Screen options={{ title: t(`modes.${mode}`) }} />
        <View style={[styles.centre, { gap: theme.spacing.md }]}>
          <StateView
            testID="practice-done"
            icon="checkmark-circle"
            title={t('done.title')}
            body={t('done.score', { correct, total: results.length })}
          />
          {xp > 0 && (
            <Text variant="bodyStrong" tone="accent" align="center">
              {t('done.xp', { count: xp })}
            </Text>
          )}
          {capped && (
            <Text variant="caption" tone="secondary" style={styles.note}>
              {t('done.capped')}
            </Text>
          )}
          <View style={[styles.actions, { gap: theme.spacing.sm }]}>
            <Button
              testID="practice-again"
              label={t('done.again')}
              onPress={() => {
                setResults(null);
                void refetch();
              }}
              fullWidth
            />
            <Button variant="ghost" label={t('done.back')} onPress={() => router.back()} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t(`modes.${mode}`) }} />
      <QuestionRunner
        questions={data.questions}
        context="practice"
        heading={t(`subtitle.${mode}`)}
        progressLabel={(current, total) => t('progress', { current, total })}
        onFinished={setResults}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  note: { textAlign: 'center', paddingHorizontal: 24 },
  actions: { alignSelf: 'stretch', paddingHorizontal: 24 },
});

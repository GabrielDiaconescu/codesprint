import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Screen, SkeletonLines, StateView, Text } from '@/components/ui';
import { useClaimChallenge, useDailyChallenge } from '@/features/home/hooks/useHome';
import { QuestionRunner } from '@/features/practice/components/QuestionRunner';
import { AchievementToast } from '@/features/progress/components/AchievementToast';
import { useAchievements } from '@/features/progress/hooks/useAchievements';
import type { AnswerResult } from '@/services';
import { useTheme } from '@/theme';

/**
 * The Daily Challenge (SPEC §24).
 *
 * The bonus is claimed explicitly at the end rather than paid automatically, so the learner
 * sees what they earned. The claim is idempotent on the server — one row per user per local
 * date — so a double tap or a retry pays exactly once.
 */
export default function ChallengeScreen() {
  const { t } = useTranslation('challenge');
  const { t: common } = useTranslation('common');
  const theme = useTheme();
  const router = useRouter();

  const { data, isPending, isError, refetch } = useDailyChallenge();
  const claim = useClaimChallenge();
  const { data: catalogue } = useAchievements();

  const [results, setResults] = useState<AnswerResult[] | null>(null);

  if (isPending) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('title') }} />
        <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.lg }}>
          <SkeletonLines lines={3} />
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

  // Already done today: shown before the questions, so nobody re-answers for nothing.
  if (data.claimed && !results) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('title') }} />
        <View style={styles.centre}>
          <StateView
            testID="challenge-claimed"
            icon="checkmark-done-circle"
            title={t('claimed.title')}
            body={t('claimed.body')}
            actionLabel={t('claimed.back')}
            onAction={() => router.back()}
          />
        </View>
      </Screen>
    );
  }

  if (results) {
    const correct = results.filter((result) => result.correct).length;

    return (
      <Screen>
        <Stack.Screen options={{ title: t('title') }} />
        <View style={[styles.centre, { gap: theme.spacing.md }]}>
          <StateView
            testID="challenge-done"
            icon="checkmark-circle"
            title={t('done.title')}
            body={t('done.score', { correct, total: results.length })}
          />

          {claim.isSuccess ? (
            <>
              {claim.data.xp_awarded > 0 ? (
                <Text testID="challenge-bonus" variant="bodyStrong" tone="accent" align="center">
                  {t('done.bonus', { count: claim.data.xp_awarded })}
                </Text>
              ) : (
                <Text variant="caption" tone="secondary" align="center">
                  {t('done.noBonus')}
                </Text>
              )}

              {claim.data.unlocked.map((achievement) => (
                <AchievementToast
                  key={achievement.id}
                  achievement={achievement}
                  name={
                    catalogue?.find((entry) => entry.slug === achievement.slug)?.name ??
                    achievement.slug
                  }
                />
              ))}
            </>
          ) : (
            <View style={[styles.actions, { gap: theme.spacing.sm }]}>
              {claim.isError && (
                <Text variant="caption" tone="danger" align="center">
                  {t('error.claimFailed')}
                </Text>
              )}
              <Button
                testID="challenge-claim"
                label={t('done.claim')}
                onPress={() => claim.mutate()}
                loading={claim.isPending}
                fullWidth
              />
            </View>
          )}

          <Button variant="ghost" label={t('done.back')} onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t('title') }} />
      <QuestionRunner
        questions={data.questions}
        context="challenge"
        heading={t('subtitle')}
        progressLabel={(current, total) => t('progress', { current, total })}
        onFinished={setResults}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actions: { alignSelf: 'stretch', paddingHorizontal: 24 },
});

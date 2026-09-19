import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AnswerFeedback, Badge, Button, Icon, Text } from '@/components/ui';
import { RewardedLifeCard } from '@/features/ads/components/RewardedLifeCard';
import { LivesIndicator } from '@/features/progress/components/LivesIndicator';
import { QuestionRenderer, instructionKey } from '@/features/questions/components/QuestionRenderer';
import { useSubmitAnswer } from '@/features/questions/hooks/useSubmitAnswer';
import { isAnswerComplete } from '@/features/questions/logic/answers';
import { parseQuestion } from '@/features/questions/payloads';
import { emptyAnswer, type AnswerValue, type Solution } from '@/features/questions/types';
import type { AnswerContext, AnswerResult, RenderableQuestion } from '@/services';
import { useTheme } from '@/theme';

interface QuestionPageProps {
  question: RenderableQuestion;
  number: number;
  total: number;
  /** Decides the server-side rules: lesson XP, practice XP, or a challenge attempt. */
  context?: AnswerContext;
  /** Called once the learner has seen the result and moves on. */
  onContinue: (result: AnswerResult) => void;
  /** Called when the question cannot be rendered at all, so the player can skip it. */
  onSkip: () => void;
}

/**
 * One question, from blank to graded (SPEC §16, §18).
 *
 * The state machine is small and deliberate:
 *
 *   answering ──Check──▶ pending ──ok──▶ graded ──Continue──▶ (next page)
 *                           └──error──▶ answering (selection kept, Check offered again)
 *
 * A network failure never loses the selection and never records anything: the server did
 * not see the answer, so nothing was graded, deducted or counted (SPEC §18).
 */
export const QuestionPage = ({
  question,
  number,
  total,
  context = 'lesson',
  onContinue,
  onSkip,
}: QuestionPageProps) => {
  const { t } = useTranslation('lesson');
  const theme = useTheme();

  const parsed = useMemo(() => parseQuestion(question), [question]);
  const [value, setValue] = useState<AnswerValue>(() =>
    emptyAnswer(question.type as AnswerValue['type']),
  );
  const [result, setResult] = useState<AnswerResult | null>(null);

  const submit = useSubmitAnswer(context);

  if (!parsed) {
    // A payload the renderer cannot understand. Said out loud and skipped, rather than an
    // empty card the learner cannot get past (SPEC §46).
    return (
      <View style={[styles.unrenderable, { gap: theme.spacing.md }]}>
        <Icon name="alert-circle-outline" size="lg" color={theme.colors.warning} />
        <Text variant="body" tone="secondary" align="center">
          {t('question.unrenderable')}
        </Text>
        <Button label={t('question.continue')} onPress={onSkip} />
      </View>
    );
  }

  const graded = result !== null;
  const canCheck = !graded && !submit.isPending && isAnswerComplete(parsed, value);

  const check = () => {
    submit.mutate({ questionId: question.id, value }, { onSuccess: (graded) => setResult(graded) });
  };

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <View style={[styles.header, { gap: theme.spacing.sm }]}>
        <Text variant="label" tone="secondary" style={styles.flex}>
          {t('pages.questionOf', { current: number, total })}
        </Text>
        <Badge label={t(`difficulty.${question.difficulty}`)} tone="neutral" />
      </View>

      {/* Lives appear only once they are in play: showing five full hearts to a beginner in
          the grace period would imply a threat that does not exist (SPEC §22). */}
      {result && !result.lives.unlimited && result.lives.lives < result.lives.max && (
        <LivesIndicator
          lives={result.lives.lives}
          max={result.lives.max}
          unlimited={false}
          nextLifeAt={result.lives.next_life_at}
        />
      )}

      {/* Out of lives: the countdown above says how long waiting takes, and this offers the
          other two ways forward (SPEC §22). */}
      {result && !result.lives.unlimited && result.lives.lives === 0 && <RewardedLifeCard />}

      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="heading" accessibilityRole="header">
          {question.prompt}
        </Text>
        <Text variant="caption" tone="secondary">
          {t(instructionKey(parsed))}
        </Text>
      </View>

      <QuestionRenderer
        question={question}
        parsed={parsed}
        value={value}
        onChange={setValue}
        disabled={graded || submit.isPending}
        solution={result?.solution as Solution | undefined}
        correct={result?.correct}
      />

      {submit.isError && !graded && (
        <View style={[styles.error, { gap: theme.spacing.sm }]} accessibilityRole="alert">
          <Icon name="cloud-offline-outline" size="md" color={theme.colors.danger} />
          <Text variant="bodySmall" tone="danger" style={styles.flex}>
            {t('question.submitError')}
          </Text>
        </View>
      )}

      {graded ? (
        <AnswerFeedback
          testID="answer-feedback"
          status={result.correct ? 'correct' : 'incorrect'}
          explanation={result.explanation}
          hint={result.correct ? undefined : (result.hint ?? undefined)}
          xpAwarded={result.xp_awarded}
          correctLabel={t('question.correct')}
          incorrectLabel={t('question.incorrect')}
          hintLabel={t('question.hint')}
          primaryActionLabel={t('question.continue')}
          onPrimaryAction={() => onContinue(result)}
        />
      ) : (
        <Button
          testID="check-answer"
          label={t('question.check')}
          onPress={check}
          disabled={!canCheck}
          loading={submit.isPending}
          fullWidth
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  error: { flexDirection: 'row', alignItems: 'flex-start' },
  unrenderable: { alignItems: 'center', paddingVertical: 24 },
});

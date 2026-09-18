import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Icon, ProgressBar, Text } from '@/components/ui';
import { QuestionRenderer, instructionKey } from '@/features/questions/components/QuestionRenderer';
import { isAnswerComplete } from '@/features/questions/logic/answers';
import { parseQuestion } from '@/features/questions/payloads';
import { emptyAnswer, toSubmission, type AnswerValue } from '@/features/questions/types';
import type { ExamPaper } from '@/services';
import { useTheme } from '@/theme';

import { useSaveExamProgress } from '../hooks/useExams';
import { firstUnansweredIndex } from '../logic/results';

import { ExamTimer } from './ExamTimer';

export interface ExamRunnerProps {
  paper: ExamPaper;
  onSubmit: (answers: Record<string, unknown>) => void;
  submitting: boolean;
}

/**
 * Sitting an exam (SPEC §27).
 *
 * Deliberately NOT built on `QuestionPage`, which is the lesson and practice player. That
 * component's whole job is to check an answer and show the verdict, and an exam must do
 * neither: no Check button, no feedback panel, no explanation, no hint, no lives. Reusing it
 * and disabling half of it would have left the grading call one prop away from firing.
 *
 * What it does instead is what a paper exam does — let the learner move back and forth, change
 * their mind, and hand everything in at the end.
 *
 * Answers are saved to the server as the learner navigates, so a crash costs the current
 * question rather than the whole sitting (SPEC §36).
 */
export const ExamRunner = ({ paper, onSubmit, submitting }: ExamRunnerProps) => {
  const { t } = useTranslation('exam');
  const { t: lesson } = useTranslation('lesson');
  const theme = useTheme();
  const save = useSaveExamProgress();

  // A resumed attempt opens where the learner left off. Initial state rather than an effect:
  // the route remounts this component per attempt (`key={paper.attempt_id}`), so there is
  // nothing to synchronise afterwards.
  const [index, setIndex] = useState(() =>
    paper.resumed
      ? firstUnansweredIndex(
          paper.questions.map((question) => question.id),
          paper.saved_answers,
        )
      : 0,
  );
  const scroll = useRef<ScrollView>(null);

  // Parsed once: the payload shape never changes, and re-parsing on every keystroke of a
  // free-text answer would be wasted work on the longest screen in the product.
  const parsed = useMemo(
    () => paper.questions.map((question) => ({ question, payload: parseQuestion(question) })),
    [paper.questions],
  );

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>(() => {
    const initial: Record<string, AnswerValue> = {};
    for (const { question, payload } of parsed) {
      if (payload) initial[question.id] = emptyAnswer(payload.type);
    }
    return initial;
  });

  const current = parsed[index];

  const persist = useCallback(
    (questionId: string, value: AnswerValue) => {
      save.mutate({
        attemptId: paper.attempt_id,
        answers: { [questionId]: toSubmission(value) },
      });
    },
    [paper.attempt_id, save],
  );

  const go = (next: number) => {
    // Saved on the way out of a question rather than on every keystroke: one request per
    // question answered, not one per character typed (SPEC §45, §60).
    if (current && answers[current.question.id]) {
      const value = answers[current.question.id];
      if (value) persist(current.question.id, value);
    }
    setIndex(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  const handIn = () => {
    const payload: Record<string, unknown> = {};
    for (const { question, payload: shape } of parsed) {
      const value = answers[question.id];
      // An incomplete answer is left out rather than sent half-filled: the server marks a
      // missing answer wrong, which is what an unanswered question is.
      if (shape && value && isAnswerComplete(shape, value)) {
        payload[question.id] = toSubmission(value);
      }
    }
    onSubmit(payload);
  };

  const answeredCount = parsed.filter(({ question, payload: shape }) => {
    const value = answers[question.id];
    return shape !== null && value !== undefined && isAnswerComplete(shape, value);
  }).length;

  const onLast = index + 1 >= parsed.length;

  if (!current) return null;

  return (
    <>
      <View style={[styles.header, { paddingTop: theme.spacing.sm, gap: theme.spacing.sm }]}>
        <View style={styles.headerRow}>
          <Text variant="label" tone="secondary">
            {t('progress', { current: index + 1, total: parsed.length })}
          </Text>
          <ExamTimer expiresAt={paper.expires_at} onExpired={handIn} />
        </View>
        <ProgressBar
          value={(index + 1) / parsed.length}
          label={t('answeredOf', { answered: answeredCount, total: parsed.length })}
        />
      </View>

      <ScrollView
        ref={scroll}
        testID="exam-scroll"
        contentContainerStyle={[styles.content, { gap: theme.spacing.lg }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: theme.spacing.sm }}>
          {current.payload && (
            <Text variant="caption" tone="secondary">
              {lesson(instructionKey(current.payload))}
            </Text>
          )}
          <Text variant="bodyStrong" accessibilityRole="header">
            {current.question.prompt}
          </Text>
        </View>

        {current.payload === null ? (
          // A question this build cannot render is skipped rather than crashing the exam. It
          // is marked wrong, which is the honest outcome — but the other 29 still count.
          <View style={[styles.unrenderable, { gap: theme.spacing.sm }]}>
            <Icon name="alert-circle-outline" size="lg" color={theme.colors.textSecondary} />
            <Text variant="body" tone="secondary">
              {t('unrenderable')}
            </Text>
          </View>
        ) : (
          <QuestionRenderer
            key={current.question.id}
            question={current.question}
            parsed={current.payload}
            value={answers[current.question.id] ?? emptyAnswer(current.payload.type)}
            onChange={(value) =>
              setAnswers((previous) => ({ ...previous, [current.question.id]: value }))
            }
            // Never graded mid-exam, so the renderers stay editable throughout and are never
            // handed a solution to mark against (SPEC §27).
            disabled={submitting}
          />
        )}
      </ScrollView>

      <View style={[styles.footer, { gap: theme.spacing.sm, paddingBottom: theme.spacing.lg }]}>
        <Button
          testID="exam-previous"
          label={t('previous')}
          variant="secondary"
          icon="chevron-back-outline"
          disabled={index === 0 || submitting}
          onPress={() => go(index - 1)}
        />
        {onLast ? (
          <Button
            testID="exam-hand-in"
            label={t('handIn')}
            icon="checkmark-done-outline"
            loading={submitting}
            onPress={handIn}
            fullWidth
          />
        ) : (
          <Button
            testID="exam-next"
            label={t('next')}
            icon="chevron-forward-outline"
            disabled={submitting}
            onPress={() => go(index + 1)}
            fullWidth
          />
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  header: { paddingHorizontal: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  content: { paddingVertical: 16, flexGrow: 1 },
  footer: { flexDirection: 'row', alignItems: 'center' },
  unrenderable: { alignItems: 'center', paddingVertical: 24 },
});

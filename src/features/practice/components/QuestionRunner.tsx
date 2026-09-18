import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ProgressBar, Text } from '@/components/ui';
import { QuestionPage } from '@/features/lesson/components/QuestionPage';
import type { AnswerContext, AnswerResult, RenderableQuestion } from '@/services';
import { useTheme } from '@/theme';

interface QuestionRunnerProps {
  questions: RenderableQuestion[];
  /** Which rules the server should apply — practice XP, or a challenge attempt. */
  context: AnswerContext;
  /** Shown above the progress bar. */
  heading: string;
  progressLabel: (current: number, total: number) => string;
  onFinished: (results: AnswerResult[]) => void;
}

/**
 * Answers a list of questions, one screen at a time (SPEC §23, §24).
 *
 * Shared by Practice and the Daily Challenge because they differ only in what the server does
 * with the answers, not in how they are asked. `QuestionPage` does the actual work, so the
 * eight renderers, the Check button, the feedback panel and the lives display are identical
 * to a lesson — which is the point: a question should not behave differently depending on
 * where the learner met it.
 */
export const QuestionRunner = ({
  questions,
  context,
  heading,
  progressLabel,
  onFinished,
}: QuestionRunnerProps) => {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<AnswerResult[]>([]);

  const current = questions[index];
  if (!current) return null;

  const progress = (index + 1) / questions.length;

  return (
    <>
      <View style={{ paddingTop: theme.spacing.sm, gap: theme.spacing.xs }}>
        <ProgressBar value={progress} label={progressLabel(index + 1, questions.length)} />
        <Text variant="label" tone="secondary">
          {heading}
        </Text>
      </View>

      <ScrollView
        testID="runner-scroll"
        contentContainerStyle={[styles.content, { gap: theme.spacing.lg }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Keyed by question id so moving on resets the next question's state entirely. */}
        <QuestionPage
          key={current.id}
          question={current}
          number={index + 1}
          total={questions.length}
          context={context}
          onContinue={(result) => {
            const next = [...results, result];
            setResults(next);
            if (index + 1 >= questions.length) {
              onFinished(next);
            } else {
              setIndex(index + 1);
            }
          }}
          onSkip={() => {
            if (index + 1 >= questions.length) {
              onFinished(results);
            } else {
              setIndex(index + 1);
            }
          }}
        />
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  content: { paddingVertical: 16, flexGrow: 1 },
});

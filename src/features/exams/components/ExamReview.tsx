import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, CodeBlock, Divider, Icon, Text } from '@/components/ui';
import type { ExamResults, ReviewedQuestion } from '@/services';
import { useTheme } from '@/theme';

export interface ExamReviewProps {
  results: ExamResults;
  onClose: () => void;
}

/**
 * Going back through a finished exam (SPEC §27).
 *
 * This is the part of exam mode that actually teaches. The score is a number; the reason a
 * particular answer was wrong is the thing worth coming back for — so every question is shown
 * with its explanation, right or wrong, rather than only the failures.
 *
 * The verdict is an icon AND a word, never a colour on its own (SPEC §47).
 */
export const ExamReview = ({ results, onClose }: ExamReviewProps) => {
  const { t } = useTranslation('exam');
  const theme = useTheme();

  const renderQuestion = (question: ReviewedQuestion) => (
    <Card
      key={question.id}
      testID={`exam-review-${question.ord}`}
      appearance="outlined"
      accessibilityLabel={t(
        question.is_correct ? 'review.accessibilityCorrect' : 'review.accessibilityWrong',
        { number: question.ord, prompt: question.prompt },
      )}
    >
      <View style={{ gap: theme.spacing.md }}>
        <View style={[styles.header, { gap: theme.spacing.sm }]}>
          <Icon
            name={question.is_correct ? 'checkmark-circle' : 'close-circle'}
            color={question.is_correct ? theme.colors.success : theme.colors.danger}
          />
          <Text variant="label" tone="secondary">
            {t('review.number', { number: question.ord })}
          </Text>
          <Text variant="label" tone={question.is_correct ? 'success' : 'danger'}>
            {t(question.is_correct ? 'review.correct' : 'review.wrong')}
          </Text>
        </View>

        <Text variant="body">{question.prompt}</Text>

        {question.code_snippet && <CodeBlock code={question.code_snippet} />}

        {question.explanation && (
          <>
            <Divider />
            <Text variant="body" tone="secondary">
              {question.explanation}
            </Text>
          </>
        )}
      </View>
    </Card>
  );

  return (
    <ScrollView
      testID="exam-review-list"
      contentContainerStyle={[styles.content, { gap: theme.spacing.md }]}
      showsVerticalScrollIndicator={false}
    >
      <Text variant="title" accessibilityRole="header">
        {t('review.title')}
      </Text>
      <Text variant="body" tone="secondary">
        {t('review.subtitle', {
          correct: results.correct_count,
          total: results.question_count,
        })}
      </Text>

      {results.questions.map(renderQuestion)}

      <Button testID="exam-review-done" label={t('review.done')} onPress={onClose} fullWidth />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { paddingVertical: 16 },
  header: { flexDirection: 'row', alignItems: 'center' },
});

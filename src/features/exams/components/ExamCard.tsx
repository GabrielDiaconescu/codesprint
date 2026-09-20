import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, Text } from '@/components/ui';
import type { ExamSummary } from '@/services';
import { useTheme } from '@/theme';

import { examAction } from '../logic/results';

export interface ExamCardProps {
  exam: ExamSummary;
  onStart: (exam: ExamSummary) => void;
  busy?: boolean;
}

/**
 * One exam on the list (SPEC §27).
 *
 * A locked exam is shown, not hidden. A free learner should be able to see that a 30-question
 * exam exists and what unlocks it — hiding it would make the Premium tier harder to
 * understand, not easier to sell (SPEC §33: honest, no dark patterns).
 *
 * The reason is always spelled out: "used this week's attempt", "available again later" and
 * "Premium" are three different situations with three different answers.
 */
export const ExamCard = ({ exam, onStart, busy = false }: ExamCardProps) => {
  const { t } = useTranslation('exam');
  const theme = useTheme();

  const action = examAction(exam);
  const locked = action === 'locked';

  return (
    <Card testID={`exam-card-${exam.slug}`} appearance={locked ? 'outlined' : 'elevated'}>
      <View style={{ gap: theme.spacing.md }}>
        <View style={[styles.header, { gap: theme.spacing.sm }]}>
          <Text variant="bodyStrong" style={styles.title}>
            {exam.title}
          </Text>
          {exam.requires_premium && <Badge label={t('premium')} tone="accent" icon="star" />}
        </View>

        <Text variant="body" tone="secondary">
          {exam.description}
        </Text>

        <View style={[styles.facts, { gap: theme.spacing.sm }]}>
          <Badge label={t('facts.questions', { count: exam.question_count })} icon="list" />
          <Badge
            label={
              exam.time_limit_minutes === null
                ? t('facts.untimed')
                : t('facts.minutes', { count: exam.time_limit_minutes })
            }
            icon="time"
          />
          <Badge label={t('facts.pass', { pct: exam.pass_threshold_pct })} icon="flag" />
        </View>

        {exam.attempts_taken > 0 && exam.best_score_pct !== null && (
          <Text variant="caption" tone={exam.ever_passed ? 'success' : 'secondary'}>
            {exam.ever_passed
              ? t('best.passed', { pct: Math.round(exam.best_score_pct) })
              : t('best.notYet', { pct: Math.round(exam.best_score_pct) })}
          </Text>
        )}

        {locked && exam.unavailable_reason && (
          <Text
            testID={`exam-locked-${exam.unavailable_reason}`}
            variant="caption"
            tone="secondary"
          >
            {t(`locked.${exam.unavailable_reason}`)}
          </Text>
        )}

        <Button
          testID={`exam-action-${exam.slug}`}
          label={t(`action.${action}`)}
          variant={action === 'resume' ? 'primary' : locked ? 'secondary' : 'primary'}
          icon={locked ? 'lock-closed' : 'play'}
          disabled={locked}
          loading={busy}
          onPress={() => onStart(exam)}
          fullWidth
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1 },
  facts: { flexDirection: 'row', flexWrap: 'wrap' },
});

import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Badge, Button, Card, Divider, ProgressRing, Text } from '@/components/ui';
import { AchievementToast } from '@/features/progress/components/AchievementToast';
import { useAchievements } from '@/features/progress/hooks/useAchievements';
import type { ExamResults } from '@/services';
import { useTheme } from '@/theme';

import { questionsShortOfPass, weakestSkills } from '../logic/results';

export interface ExamResultsViewProps {
  results: ExamResults;
  onClose: () => void;
  onReview: () => void;
}

/**
 * The results page (SPEC §27, §28).
 *
 * Written for somebody who has just failed, because that is the harder case. The score comes
 * with how many questions were missing rather than the arithmetic, the weak areas are three
 * things to revise rather than a table, and nothing on the page tells them they are bad at
 * this — the tone rules in SPEC §9 do not stop applying because the news is worse.
 *
 * A pass gets the same page with a different verdict, so nobody has to maintain two screens
 * that drift apart.
 */
export const ExamResultsView = ({ results, onClose, onReview }: ExamResultsViewProps) => {
  const { t } = useTranslation('exam');
  const theme = useTheme();
  const { data: catalogue } = useAchievements();

  const short = questionsShortOfPass(results);
  const weak = weakestSkills(results);

  return (
    <ScrollView
      testID="exam-results"
      contentContainerStyle={[styles.content, { gap: theme.spacing.lg }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.verdict, { gap: theme.spacing.md }]}>
        <ProgressRing
          value={results.score_pct / 100}
          tone={results.passed ? 'success' : 'accent'}
          size={140}
          label={t('results.accessibility', { pct: Math.round(results.score_pct) })}
        >
          <Text variant="title">{`${Math.round(results.score_pct)}%`}</Text>
        </ProgressRing>
        {/* Icon and words, never colour alone (SPEC §47). */}
        <Badge
          label={results.passed ? t('results.passed') : t('results.notPassed')}
          tone={results.passed ? 'success' : 'warning'}
          icon={results.passed ? 'checkmark-circle' : 'refresh-circle'}
        />
        <Text variant="body" tone="secondary" style={styles.centred}>
          {t('results.correctOf', {
            correct: results.correct_count,
            total: results.question_count,
          })}
        </Text>
        {short > 0 && (
          <Text variant="body" tone="secondary" style={styles.centred}>
            {t('results.short', { count: short })}
          </Text>
        )}
      </View>

      {results.xp_awarded > 0 && (
        <Card testID="exam-xp">
          <View style={{ gap: theme.spacing.xs }}>
            <Text variant="bodyStrong">{t('results.xp', { xp: results.xp_awarded })}</Text>
            <Text variant="caption" tone="secondary">
              {t('results.xpExplainer')}
            </Text>
          </View>
        </Card>
      )}

      {results.unlocked.map((achievement) => (
        <AchievementToast
          key={achievement.id}
          achievement={achievement}
          // The unlock carries a slug; the localized name lives in the catalogue.
          name={
            catalogue?.find((entry) => entry.slug === achievement.slug)?.name ?? achievement.slug
          }
        />
      ))}

      {weak.length > 0 && (
        <Card testID="exam-weak-areas">
          <View style={{ gap: theme.spacing.md }}>
            <Text variant="bodyStrong">{t('results.weakAreas')}</Text>
            <Text variant="caption" tone="secondary">
              {t('results.weakAreasHint')}
            </Text>
            <Divider />
            {weak.map((skill) => (
              <View key={skill.tag} style={styles.skill}>
                <Text variant="body">{skill.tag}</Text>
                <Text variant="bodyStrong" tone="secondary">
                  {skill.pct}%
                </Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      <View style={{ gap: theme.spacing.sm }}>
        <Button
          testID="exam-review"
          label={t('results.review')}
          variant="secondary"
          icon="reader-outline"
          onPress={onReview}
          fullWidth
        />
        <Button testID="exam-done" label={t('results.done')} onPress={onClose} fullWidth />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { paddingVertical: 24 },
  verdict: { alignItems: 'center' },
  centred: { textAlign: 'center' },
  skill: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});

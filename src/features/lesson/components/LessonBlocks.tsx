import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Badge, Card, CodeBlock, Icon, Text, type IconName } from '@/components/ui';
import type { LessonBlock, RenderableQuestion } from '@/services';
import { useTheme } from '@/theme';

import { RichText } from './RichText';

/**
 * Renders one lesson block (SPEC §15).
 *
 * The four block types are deliberately visually distinct: prose reads as prose, code reads as
 * code, and a callout interrupts. That difference is what makes progressive disclosure work —
 * a wall of uniform text is the thing the spec asks us to avoid.
 */

const CALLOUT_STYLES: Record<
  'note' | 'tip' | 'mistake',
  { icon: IconName; surface: 'primary' | 'success' | 'danger' }
> = {
  note: { icon: 'information-circle', surface: 'primary' },
  tip: { icon: 'bulb', surface: 'success' },
  mistake: { icon: 'warning', surface: 'danger' },
};

const Callout = ({ variant, body }: { variant: 'note' | 'tip' | 'mistake'; body: string }) => {
  const { t } = useTranslation('lesson');
  const theme = useTheme();
  const style = CALLOUT_STYLES[variant];

  const tint =
    style.surface === 'success'
      ? theme.colors.successSurface
      : style.surface === 'danger'
        ? theme.colors.dangerSurface
        : theme.colors.surfaceElevated;

  const accent =
    style.surface === 'success'
      ? theme.colors.success
      : style.surface === 'danger'
        ? theme.colors.danger
        : theme.colors.primary;

  return (
    <View
      accessibilityRole="summary"
      // The variant is named for a screen reader: a tinted box conveys nothing without sight.
      accessibilityLabel={`${t(`callout.${variant}`)}. ${body}`}
      style={[
        styles.callout,
        {
          backgroundColor: tint,
          borderLeftColor: accent,
          borderRadius: theme.radius.md,
          padding: theme.spacing.lg,
          gap: theme.spacing.sm,
        },
      ]}
    >
      <View style={[styles.calloutHeader, { gap: theme.spacing.xs }]}>
        <Icon name={style.icon} size="sm" color={accent} />
        <Text variant="label" style={{ color: accent }}>
          {t(`callout.${variant}`).toUpperCase()}
        </Text>
      </View>
      <RichText body={body} />
    </View>
  );
};

/**
 * A question, as it appears while reading (SPEC §16).
 *
 * Phase 7 shows the prompt and the code so the lesson reads as a whole. Answering — the
 * renderers per type, the grading RPC and the feedback panel — is Phase 8. Nothing here
 * pretends to accept an answer, because a control that looks live and does nothing is worse
 * than one that is honest about arriving later (SPEC §59.12).
 */
const QuestionPreview = ({ question }: { question: RenderableQuestion }) => {
  const { t } = useTranslation('lesson');
  const theme = useTheme();

  return (
    <Card testID={`question-${question.id}`} appearance="outlined">
      <View style={{ gap: theme.spacing.md }}>
        <View style={[styles.questionHeader, { gap: theme.spacing.sm }]}>
          <Badge label={t(`difficulty.${question.difficulty}`)} tone="neutral" />
          <Text variant="caption" tone="secondary" style={styles.flex}>
            {t(`questionType.${question.type}`)}
          </Text>
        </View>

        <Text variant="bodyStrong">{question.prompt}</Text>

        {question.code_snippet && <CodeBlock code={question.code_snippet} />}

        <View style={[styles.pending, { gap: theme.spacing.xs }]}>
          <Icon name="construct-outline" size="sm" color={theme.colors.textSecondary} />
          <Text variant="caption" tone="secondary" style={styles.flex}>
            {t('answering.comingSoon')}
          </Text>
        </View>
      </View>
    </Card>
  );
};

export const LessonBlockView = ({ block }: { block: LessonBlock }) => {
  switch (block.type) {
    case 'text':
      return <RichText body={block.body} />;

    case 'code':
      return <CodeBlock code={block.code} output={block.output} />;

    case 'callout':
      return <Callout variant={block.variant} body={block.body} />;

    case 'question':
      return <QuestionPreview question={block.question} />;
  }
};

const styles = StyleSheet.create({
  callout: { borderLeftWidth: 3 },
  calloutHeader: { flexDirection: 'row', alignItems: 'center' },
  questionHeader: { flexDirection: 'row', alignItems: 'center' },
  pending: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});

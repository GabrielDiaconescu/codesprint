import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { CodeBlock, Icon, RichText, Text, type IconName } from '@/components/ui';
import type { LessonBlock } from '@/services';
import { useTheme } from '@/theme';

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

export const LessonBlockView = ({ block }: { block: LessonBlock }) => {
  switch (block.type) {
    case 'text':
      return <RichText body={block.body} />;

    case 'code':
      return <CodeBlock code={block.code} output={block.output} />;

    case 'callout':
      return <Callout variant={block.variant} body={block.body} />;

    case 'question':
      // Questions are pages of their own in the player (see lesson/logic/pages.ts); one
      // reaching a reading page is a bug, and rendering nothing is safer than rendering a
      // question that cannot be answered.
      return null;
  }
};

const styles = StyleSheet.create({
  callout: { borderLeftWidth: 3 },
  calloutHeader: { flexDirection: 'row', alignItems: 'center' },
});

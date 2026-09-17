import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Badge, Card, Icon, Text } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';

import { seededShuffle } from '../logic/shuffle';
import type { ConceptMatchingPayload } from '../payloads';
import type { AnswerValue, Solution } from '../types';

/**
 * concept_matching (SPEC §16): tap a concept, then tap its definition.
 *
 * Two taps rather than drawing lines: it works one-handed, it works with a screen reader,
 * and it needs no gesture library. A matched pair carries the same number on both sides, so
 * the pairing is visible without following a line across the screen — and is named in the
 * accessibility label, so it is audible too (SPEC §47).
 *
 * Definitions are shuffled by question id; authors list them in matching order.
 */
export const ConceptMatching = ({
  questionId,
  payload,
  value,
  onChange,
  disabled,
  solution,
}: {
  questionId: string;
  payload: ConceptMatchingPayload;
  value: Extract<AnswerValue, { type: 'concept_matching' }>;
  onChange: (value: AnswerValue) => void;
  disabled: boolean;
  solution?: Solution;
}) => {
  const { t } = useTranslation('lesson');
  const theme = useTheme();

  const [active, setActive] = useState<string | null>(null);
  const definitions = useMemo(
    () => seededShuffle(payload.definitions, questionId),
    [payload, questionId],
  );

  const expected = solution && 'pairs' in solution ? solution.pairs : undefined;
  const pairs = value.pairs;

  /** The number shown on a matched concept and its definition: its position in the concept list. */
  const numberFor = (conceptId: string): number => payload.concepts.findIndex((c) => c.id === conceptId) + 1;
  const conceptOfDefinition = (definitionId: string): string | undefined =>
    Object.keys(pairs).find((conceptId) => pairs[conceptId] === definitionId);

  const tapConcept = (conceptId: string) => {
    haptics.select();
    if (pairs[conceptId]) {
      const { [conceptId]: _removed, ...rest } = pairs;
      onChange({ type: 'concept_matching', pairs: rest });
      setActive(null);
      return;
    }
    setActive(active === conceptId ? null : conceptId);
  };

  const tapDefinition = (definitionId: string) => {
    if (!active) return;
    haptics.select();
    // A definition already taken by another concept is released from it first.
    const previousOwner = conceptOfDefinition(definitionId);
    const next = { ...pairs };
    if (previousOwner) delete next[previousOwner];
    next[active] = definitionId;
    onChange({ type: 'concept_matching', pairs: next });
    setActive(null);
  };

  const pairMarking = (conceptId: string): 'correct' | 'wrong' | undefined => {
    if (!expected || !pairs[conceptId]) return undefined;
    return expected[conceptId] === pairs[conceptId] ? 'correct' : 'wrong';
  };

  const borderFor = (marking: 'correct' | 'wrong' | undefined, isActive: boolean, paired: boolean) => {
    if (marking === 'correct') return theme.colors.success;
    if (marking === 'wrong') return theme.colors.danger;
    if (isActive || paired) return theme.colors.primary;
    return theme.colors.border;
  };

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="label" tone="secondary">
          {t('question.matching.concepts')}
        </Text>
        {payload.concepts.map((concept) => {
          const paired = pairs[concept.id];
          const marking = pairMarking(concept.id);
          const isActive = active === concept.id;
          const definitionText = paired
            ? (payload.definitions.find((d) => d.id === paired)?.text ?? '')
            : '';

          return (
            <Card
              key={concept.id}
              testID={`concept-${concept.id}`}
              appearance="outlined"
              padding="md"
              onPress={disabled ? undefined : () => tapConcept(concept.id)}
              accessibilityRole="button"
              selected={isActive}
              accessibilityLabel={
                paired
                  ? t('question.matching.paired', { concept: concept.text, definition: definitionText })
                  : isActive
                    ? t('question.matching.pairSelected', { concept: concept.text })
                    : concept.text
              }
              style={{ borderColor: borderFor(marking, isActive, Boolean(paired)) }}
            >
              <View style={[styles.row, { gap: theme.spacing.md }]}>
                <Text variant="bodyStrong" style={styles.text}>
                  {concept.text}
                </Text>
                {paired && (
                  <Badge
                    label={String(numberFor(concept.id))}
                    tone={marking === 'correct' ? 'success' : marking === 'wrong' ? 'danger' : 'accent'}
                    icon={marking === 'correct' ? 'checkmark' : marking === 'wrong' ? 'close' : undefined}
                  />
                )}
                {isActive && !paired && <Icon name="arrow-forward" size="md" color={theme.colors.primary} />}
              </View>
            </Card>
          );
        })}
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="label" tone="secondary">
          {t('question.matching.definitions')}
        </Text>
        {definitions.map((definition) => {
          const owner = conceptOfDefinition(definition.id);
          const marking = owner ? pairMarking(owner) : undefined;
          const tappable = !disabled && active !== null;

          return (
            <Card
              key={definition.id}
              testID={`definition-${definition.id}`}
              appearance="outlined"
              padding="md"
              onPress={tappable ? () => tapDefinition(definition.id) : undefined}
              accessibilityRole="button"
              accessibilityLabel={definition.text}
              style={[
                { borderColor: borderFor(marking, false, Boolean(owner)) },
                !tappable && !owner && expected === undefined && styles.waiting,
              ]}
            >
              <View style={[styles.row, { gap: theme.spacing.md }]}>
                {owner && (
                  <Badge
                    label={String(numberFor(owner))}
                    tone={marking === 'correct' ? 'success' : marking === 'wrong' ? 'danger' : 'accent'}
                  />
                )}
                <Text variant="body" style={styles.text}>
                  {definition.text}
                </Text>
              </View>
            </Card>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1 },
  waiting: { opacity: 0.7 },
});

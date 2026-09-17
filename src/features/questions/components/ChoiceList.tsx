import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card, Icon, Text, type IconName } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';

export interface ChoiceOption {
  id: string;
  text: string;
  /** Program output and code render in the monospace face. */
  mono?: boolean;
}

interface ChoiceListProps {
  options: ChoiceOption[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  multi?: boolean;
  disabled?: boolean;
  /** Once graded, the ids that were correct. Turns the list into a marked answer sheet. */
  correctIds?: string[];
  testIDPrefix?: string;
}

type Marking = 'none' | 'selected' | 'correct' | 'wrong' | 'missed';

/**
 * Options for every choose-one / choose-many question (SPEC §16, §18, §47).
 *
 * Before grading a row is a radio or checkbox with a selected state a screen reader hears.
 * After grading it becomes an answer sheet: the correct rows carry a check, the learner's
 * wrong choice carries a cross, and each state is also NAMED in the accessibility label —
 * colour and icon alone are not enough (SPEC §47).
 */
export const ChoiceList = ({
  options,
  selectedIds,
  onSelect,
  multi = false,
  disabled = false,
  correctIds,
  testIDPrefix = 'choice',
}: ChoiceListProps) => {
  const { t } = useTranslation('lesson');
  const theme = useTheme();
  const graded = correctIds !== undefined;

  const markingFor = (id: string): Marking => {
    const selected = selectedIds.includes(id);
    if (!graded) return selected ? 'selected' : 'none';
    const correct = correctIds.includes(id);
    if (correct && selected) return 'correct';
    if (correct) return 'missed';
    if (selected) return 'wrong';
    return 'none';
  };

  const visuals: Record<Marking, { border: string; icon: IconName; iconColor: string }> = {
    none: { border: theme.colors.border, icon: multi ? 'square-outline' : 'ellipse-outline', iconColor: theme.colors.border },
    selected: { border: theme.colors.primary, icon: multi ? 'checkbox' : 'checkmark-circle', iconColor: theme.colors.primary },
    correct: { border: theme.colors.success, icon: 'checkmark-circle', iconColor: theme.colors.success },
    missed: { border: theme.colors.success, icon: 'checkmark-circle-outline', iconColor: theme.colors.success },
    wrong: { border: theme.colors.danger, icon: 'close-circle', iconColor: theme.colors.danger },
  };

  const stateLabel = (marking: Marking): string => {
    switch (marking) {
      case 'correct':
        return t('choice.correctChosen');
      case 'missed':
        return t('choice.correctMissed');
      case 'wrong':
        return t('choice.wrongChosen');
      default:
        return '';
    }
  };

  return (
    <View style={{ gap: theme.spacing.sm }} accessibilityRole={multi ? undefined : 'radiogroup'}>
      {options.map((option) => {
        const marking = markingFor(option.id);
        const visual = visuals[marking];
        const selected = selectedIds.includes(option.id);
        const suffix = stateLabel(marking);

        return (
          <Card
            key={option.id}
            testID={`${testIDPrefix}-${option.id}`}
            appearance="outlined"
            padding="md"
            onPress={
              disabled
                ? undefined
                : () => {
                    haptics.select();
                    onSelect(option.id);
                  }
            }
            accessibilityRole={multi ? 'checkbox' : 'radio'}
            selected={selected}
            accessibilityLabel={suffix ? `${option.text}. ${suffix}` : option.text}
            style={[
              { borderColor: visual.border },
              graded && marking === 'none' && styles.dimmed,
            ]}
          >
            <View style={[styles.row, { gap: theme.spacing.md }]}>
              <Icon name={visual.icon} size="lg" color={visual.iconColor} />
              <Text variant={option.mono ? 'mono' : 'body'} style={styles.text}>
                {option.text}
              </Text>
            </View>
          </Card>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1 },
  dimmed: { opacity: 0.55 },
});

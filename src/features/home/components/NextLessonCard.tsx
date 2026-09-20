import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Icon, Text } from '@/components/ui';
import { useTheme } from '@/theme';

interface NextLessonCardProps {
  title: string;
  moduleTitle: string;
  estimatedMinutes: number;
  isNew: boolean;
  onPress: () => void;
}

/**
 * The one thing the learner came to do (SPEC §13).
 *
 * Everything else on Home is context; this is the action. So it gets the biggest button in the
 * app — `size="lg"`, full width, the deepest rim — and the lesson's own title as a heading
 * rather than a caption. A learner should be able to open the app, read two words, and press
 * without deciding anything.
 *
 * A brand-new learner gets an invitation, not a resume button.
 */
export const NextLessonCard = ({
  title,
  moduleTitle,
  estimatedMinutes,
  isNew,
  onPress,
}: NextLessonCardProps) => {
  const { t } = useTranslation('home');
  const theme = useTheme();

  return (
    <Card testID="next-lesson-card">
      <View style={{ gap: theme.spacing.md }}>
        <Text variant="label" tone="secondary">
          {isNew ? t('startFirst') : t('continueTitle')}
        </Text>

        <Text variant="title">{title}</Text>

        <View style={[styles.row, { gap: theme.spacing.xs }]}>
          <Icon name="albums" size="sm" color={theme.colors.textSecondary} />
          <Text variant="caption" tone="secondary" style={styles.flex}>
            {t('lessonMeta', { module: moduleTitle, minutes: estimatedMinutes })}
          </Text>
        </View>

        <Button
          testID="home-continue"
          label={isNew ? t('startCta') : t('continueCta')}
          icon="play"
          size="lg"
          onPress={onPress}
          fullWidth
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});

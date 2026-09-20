import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Badge, Card, Icon, Text } from '@/components/ui';
import type { ModuleSummary } from '@/services';
import { useTheme } from '@/theme';

interface ModuleCardProps {
  module: ModuleSummary;
  onPress?: () => void;
}

/**
 * One module in the Learn list (SPEC §14, §47).
 *
 * A locked module is shown, not hidden. Seeing what Premium contains is the honest way to
 * present the boundary, and hiding it would make the course look shorter than it is.
 *
 * The padlock is accompanied by a text badge, because meaning must never rest on an icon or a
 * colour alone (SPEC §47).
 */
export const ModuleCard = ({ module, onPress }: ModuleCardProps) => {
  const { t } = useTranslation('learn');
  const theme = useTheme();

  return (
    <Card
      testID={`module-${module.slug}`}
      appearance="outlined"
      onPress={onPress}
      accessibilityLabel={
        module.isLocked
          ? `${module.title}. ${t('module.locked')}. ${t('module.lessons', { count: module.lessonCount })}`
          : `${module.title}. ${t('module.lessons', { count: module.lessonCount })}`
      }
    >
      <View style={{ gap: theme.spacing.sm }}>
        <View style={[styles.header, { gap: theme.spacing.sm }]}>
          <View style={[styles.number, { backgroundColor: theme.colors.surfaceElevated }]}>
            <Text variant="label" tone="secondary">
              {String(module.orderIndex).padStart(2, '0')}
            </Text>
          </View>

          <Text variant="subheading" style={styles.flex} numberOfLines={2}>
            {module.title}
          </Text>

          {module.isLocked && (
            <Badge label={t('module.locked')} tone="neutral" icon="lock-closed" />
          )}
        </View>

        {module.description.length > 0 && (
          <Text variant="bodySmall" tone="secondary">
            {module.description}
          </Text>
        )}

        <View style={[styles.meta, { gap: theme.spacing.lg }]}>
          <View style={[styles.metaItem, { gap: theme.spacing.xs }]}>
            <Icon name="book-outline" size="sm" color={theme.colors.textSecondary} />
            <Text variant="caption" tone="secondary">
              {t('module.lessons', { count: module.lessonCount })}
            </Text>
          </View>

          {module.estimatedMinutes > 0 && (
            <View style={[styles.metaItem, { gap: theme.spacing.xs }]}>
              <Icon name="time-outline" size="sm" color={theme.colors.textSecondary} />
              <Text variant="caption" tone="secondary">
                {t('module.minutes', { count: module.estimatedMinutes })}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  // MIN rather than fixed: the module number is text, and text grows with the OS font size.
  // A fixed 32x32 box clipped "01" to "0" at the larger accessibility sizes (SPEC §47).
  number: {
    minWidth: 32,
    minHeight: 32,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
});

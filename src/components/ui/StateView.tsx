import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface StateViewProps {
  icon?: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'danger';
  testID?: string;
}

/**
 * Shared shape for empty, error and offline states (SPEC §8, §36, §46).
 *
 * Every one of them offers a way forward — the user is never left on a dead end.
 */
export const StateView = ({
  icon,
  title,
  body,
  actionLabel,
  onAction,
  tone = 'neutral',
  testID,
}: StateViewProps) => {
  const theme = useTheme();

  return (
    <View
      testID={testID}
      style={[styles.root, { gap: theme.spacing.md, padding: theme.spacing.xl }]}
    >
      {icon && (
        <Icon
          name={icon}
          size="xl"
          color={tone === 'danger' ? theme.colors.danger : theme.colors.textSecondary}
        />
      )}
      <Text variant="heading" heading align="center">
        {title}
      </Text>
      {body && (
        <Text variant="body" tone="secondary" align="center" style={styles.body}>
          {body}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} variant="secondary" />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { maxWidth: 320 },
});

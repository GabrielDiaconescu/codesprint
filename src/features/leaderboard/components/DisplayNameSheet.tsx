import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { BottomSheet, Button, Text, TextField } from '@/components/ui';
import { DisplayNameRejected, type DisplayNameProblem } from '@/services';
import { useTheme } from '@/theme';

import { useSetDisplayName } from '../hooks/useLeaderboard';
import {
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  canSubmitDisplayName,
  localDisplayNameProblem,
} from '../logic/displayName';

export interface DisplayNameSheetProps {
  visible: boolean;
  onClose: () => void;
  currentName: string | null;
  onSaved?: (name: string) => void;
}

/**
 * Choosing a display name (SPEC §26).
 *
 * The name is the one thing about a learner that other people see, so this screen is honest
 * about it up front rather than after the fact. It also never says just "invalid": the server
 * returns a code for every rule, and each one maps to a sentence that says what to change.
 *
 * Validation happens twice on purpose. The local check answers instantly while typing; the
 * server owns the blocklists and uniqueness, and its verdict always wins.
 */
export const DisplayNameSheet = ({
  visible,
  onClose,
  currentName,
  onSaved,
}: DisplayNameSheetProps) => {
  const { t } = useTranslation('leaderboard');
  const theme = useTheme();
  const [name, setName] = useState(currentName ?? '');
  const [serverProblem, setServerProblem] = useState<DisplayNameProblem | null>(null);
  const mutation = useSetDisplayName();

  // Nothing is shown until the field has been touched enough to be worth judging — flagging
  // "too short" on an empty field the moment the sheet opens is nagging, not help.
  const localProblem = name.trim().length > 0 ? localDisplayNameProblem(name) : null;
  const problem = serverProblem ?? localProblem;

  const submit = () => {
    setServerProblem(null);
    mutation.mutate(name.trim(), {
      onSuccess: (saved) => {
        onSaved?.(saved);
        onClose();
      },
      onError: (error) => {
        setServerProblem(error instanceof DisplayNameRejected ? error.problem : 'unknown');
      },
    });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('name.title')}
      closeLabel={t('name.close')}
      testID="display-name-sheet"
    >
      <View style={[styles.content, { gap: theme.spacing.lg }]}>
        <Text variant="body" tone="secondary">
          {t('name.body')}
        </Text>

        <TextField
          testID="display-name-input"
          label={t('name.label')}
          value={name}
          onChangeText={(value) => {
            setName(value);
            // A rejection belongs to the text that caused it, not to what is being typed now.
            setServerProblem(null);
          }}
          placeholder={t('name.placeholder')}
          hint={t('name.hint', { min: DISPLAY_NAME_MIN, max: DISPLAY_NAME_MAX })}
          error={problem ? t(`name.problem.${problem}`) : undefined}
          returnKeyType="done"
          onSubmitEditing={submit}
        />

        <Button
          testID="display-name-save"
          label={t('name.save')}
          onPress={submit}
          loading={mutation.isPending}
          disabled={!canSubmitDisplayName(name, currentName)}
          fullWidth
        />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 8 },
});

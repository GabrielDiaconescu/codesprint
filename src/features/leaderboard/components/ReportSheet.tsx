import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { BottomSheet, Button, Card, Text, TextField } from '@/components/ui';
import { REPORT_REASONS, type LeaderboardRow, type ReportReason } from '@/services';
import { useToastStore } from '@/store/toastStore';
import { useTheme } from '@/theme';

import { useReportUser } from '../hooks/useLeaderboard';

export interface ReportSheetProps {
  /** The row being reported, or null when the sheet is closed. */
  target: LeaderboardRow | null;
  onClose: () => void;
}

const NOTE_MAX = 500;

/**
 * Reporting a display name (SPEC §26, §49).
 *
 * The queue is write-only — not even the reporter can read it back — so this sheet closes
 * with a thank-you and no status. That is a deliberate privacy choice, not a missing feature:
 * a readable report list would tell anyone who had been reported, and by how many people.
 *
 * Only the name is reportable. There is nothing else of another learner on this screen.
 */
export const ReportSheet = ({ target, onClose }: ReportSheetProps) => {
  const { t } = useTranslation('leaderboard');
  const theme = useTheme();
  const showToast = useToastStore((state) => state.show);
  const [reason, setReason] = useState<ReportReason>('offensive_name');
  const [note, setNote] = useState('');
  const mutation = useReportUser();

  const submit = () => {
    if (!target) return;

    mutation.mutate(
      { userId: target.user_id, reason, note: note.trim() || undefined },
      {
        onSuccess: () => {
          showToast({ message: t('report.thanks'), tone: 'success' });
          setNote('');
          onClose();
        },
        onError: () => {
          showToast({ message: t('report.failed'), tone: 'error' });
        },
      },
    );
  };

  return (
    <BottomSheet
      visible={target !== null}
      onClose={onClose}
      title={t('report.title')}
      closeLabel={t('report.close')}
      testID="report-sheet"
    >
      <View style={[styles.content, { gap: theme.spacing.lg }]}>
        <Text variant="body" tone="secondary">
          {t('report.body', { name: target?.display_name ?? '' })}
        </Text>

        <View style={{ gap: theme.spacing.sm }}>
          {REPORT_REASONS.map((value) => (
            <Card
              key={value}
              testID={`report-reason-${value}`}
              appearance="outlined"
              padding="md"
              onPress={() => setReason(value)}
              accessibilityRole="radio"
              accessibilityLabel={t(`report.reason.${value}`)}
              selected={reason === value}
            >
              <Text variant="body">{t(`report.reason.${value}`)}</Text>
            </Card>
          ))}
        </View>

        <TextField
          testID="report-note"
          label={t('report.note')}
          value={note}
          onChangeText={(value) => setNote(value.slice(0, NOTE_MAX))}
          placeholder={t('report.notePlaceholder')}
          hint={t('report.noteHint')}
        />

        <Button
          testID="report-submit"
          label={t('report.submit')}
          variant="danger"
          onPress={submit}
          loading={mutation.isPending}
          fullWidth
        />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 8 },
});

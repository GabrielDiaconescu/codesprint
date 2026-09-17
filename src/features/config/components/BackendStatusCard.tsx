import { StyleSheet, View } from 'react-native';

import { Badge, Card, Divider, Skeleton, Text } from '@/components/ui';
import { useTheme } from '@/theme';

import { useAppConfig } from '../hooks/useAppConfig';

/**
 * Development-only panel proving the app is reading `app_config` from the database rather
 * than from bundled defaults (SPEC §57, Phase 3 device check).
 *
 * It is deliberately explicit about WHICH source won: a panel that looked the same either
 * way would prove nothing, since the bundled defaults are intentionally identical to the
 * seeded rows.
 *
 * Strings are not localized — this never ships to a user, and adding it to the i18n
 * namespaces would pollute the translation files (SPEC §38).
 */
export const BackendStatusCard = () => {
  const theme = useTheme();
  const { data, isLoading, isError, isFetching, dataUpdatedAt } = useAppConfig();

  return (
    <Card appearance="outlined">
      <View style={[styles.header, { gap: theme.spacing.sm }]}>
        <Text variant="label" tone="secondary">
          BACKEND (DEV)
        </Text>
        {isError ? (
          <Badge label="Defaults" tone="danger" icon="cloud-offline" />
        ) : isFetching ? (
          <Badge label="Loading" tone="neutral" icon="sync" />
        ) : (
          <Badge label="Database" tone="success" icon="cloud-done" />
        )}
      </View>

      <Divider />

      {isLoading || !data ? (
        <View style={{ gap: theme.spacing.sm, paddingTop: theme.spacing.sm }}>
          <Skeleton height={14} />
          <Skeleton height={14} width="70%" />
        </View>
      ) : (
        <View style={{ gap: theme.spacing.xs, paddingTop: theme.spacing.sm }}>
          <Row label="content_version" value={String(data.content_version)} />
          <Row label="free_module_count" value={String(data.free_module_count)} />
          <Row label="lives_max" value={String(data.lives_max)} />
          <Row label="leaderboard_enabled" value={data.leaderboard_enabled ? 'true' : 'false'} />
          <Row label="min_supported_app_version" value={data.min_supported_app_version} />
          <Row
            label="fetched"
            value={dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—'}
          />
        </View>
      )}

      {isError && (
        <Text variant="caption" tone="danger" style={styles.note}>
          Could not reach the database — showing bundled defaults. On a physical phone,
          EXPO_PUBLIC_SUPABASE_URL must be this PC&apos;s LAN address, not 127.0.0.1.
        </Text>
      )}
    </Card>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text variant="caption" tone="secondary">
      {label}
    </Text>
    <Text variant="monoSmall">{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  note: { marginTop: 8 },
});

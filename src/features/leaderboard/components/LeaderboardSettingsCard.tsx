import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Divider, Text, Toggle } from '@/components/ui';
import { useAppConfig } from '@/features/config/hooks/useAppConfig';
import { classifyAge } from '@/features/onboarding/logic/age';
import type { UserProfile } from '@/services';
import { useToastStore } from '@/store/toastStore';
import { useTheme } from '@/theme';

import { useSetLeaderboardVisibility } from '../hooks/useLeaderboard';

import { Avatar } from './Avatar';
import { DisplayNameSheet } from './DisplayNameSheet';

export interface LeaderboardSettingsCardProps {
  profile: UserProfile;
}

/**
 * Display name and leaderboard visibility, on the Profile screen (SPEC §26, §29).
 *
 * Both controls live together because they answer the same question — what other people see
 * of you — and separating "your name" from "who can see it" is how a privacy setting ends up
 * somewhere nobody looks.
 *
 * A guest gets neither: they are not ranked at all, and offering a name to somebody whose
 * account disappears in thirty days is a promise the product does not keep (SPEC §12).
 *
 * A learner under `minor_protection_age` gets the toggle disabled with the reason spelled out.
 * The server forces `leaderboard_hidden` for them whatever the client sends (SPEC §41), so a
 * live switch would flick on and snap back — which reads as a broken app rather than as a
 * protection. Saying so is the honest version of the same rule.
 */
export const LeaderboardSettingsCard = ({ profile }: LeaderboardSettingsCardProps) => {
  const { t } = useTranslation('leaderboard');
  const theme = useTheme();
  const showToast = useToastStore((state) => state.show);
  const [naming, setNaming] = useState(false);
  const visibility = useSetLeaderboardVisibility();
  const { data: config } = useAppConfig();

  // Fails closed on an unknown birth year, exactly as `public.is_minor()` does: the server
  // would force `leaderboard_hidden` anyway, and a toggle that promises otherwise lies.
  const isProtectedMinor =
    profile.birthYear === null ||
    classifyAge(profile.birthYear, {
      minUserAge: config.min_user_age,
      minorProtectionAge: config.minor_protection_age,
    }) === 'protected-minor';

  if (profile.isAnonymous) {
    return (
      <Card testID="leaderboard-settings-guest" appearance="outlined">
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="bodyStrong">{t('settings.title')}</Text>
          <Text variant="body" tone="secondary">
            {t('absence.guest.body')}
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <>
      <Card testID="leaderboard-settings">
        <View style={{ gap: theme.spacing.lg }}>
          <Text variant="bodyStrong">{t('settings.title')}</Text>

          <View style={[styles.identity, { gap: theme.spacing.md }]}>
            <Avatar
              displayName={profile.displayName ?? '?'}
              avatarKey={profile.avatarKey}
              size={48}
            />
            <View style={styles.identityText}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {profile.displayName ?? t('settings.noName')}
              </Text>
              <Text variant="caption" tone="secondary">
                {profile.displayName ? t('settings.nameHint') : t('settings.noNameHint')}
              </Text>
            </View>
          </View>

          <Button
            testID="leaderboard-edit-name"
            variant="secondary"
            label={profile.displayName ? t('settings.changeName') : t('settings.chooseName')}
            icon="person-outline"
            onPress={() => setNaming(true)}
            fullWidth
          />

          <Divider />

          <Toggle
            testID="leaderboard-hide-toggle"
            label={t('settings.hide')}
            description={
              isProtectedMinor
                ? t('settings.hideMinor', { age: config.minor_protection_age })
                : t('settings.hideDescription')
            }
            value={isProtectedMinor ? true : profile.leaderboardHidden}
            disabled={visibility.isPending || isProtectedMinor}
            onValueChange={(hidden) => {
              visibility.mutate(hidden, {
                onError: () => showToast({ message: t('settings.hideFailed'), tone: 'error' }),
              });
            }}
          />
        </View>
      </Card>

      <DisplayNameSheet
        visible={naming}
        onClose={() => setNaming(false)}
        currentName={profile.displayName}
        onSaved={(name) => showToast({ message: t('name.saved', { name }), tone: 'success' })}
      />
    </>
  );
};

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center' },
  identityText: { flex: 1 },
});

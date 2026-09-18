import { Screen } from '@/components/ui';
import { LeaderboardBoard } from '@/features/leaderboard/components/LeaderboardBoard';
import { useProfile } from '@/features/profile/hooks/useProfile';

/**
 * Leaderboard tab (SPEC §10, §26).
 *
 * The tab itself is hidden when `leaderboard_enabled` is off — that is handled in the tabs
 * layout, so this route never has to think about the flag.
 */
export default function LeaderboardScreen() {
  const { data: profile } = useProfile();

  return (
    <Screen>
      <LeaderboardBoard currentName={profile?.displayName ?? null} />
    </Screen>
  );
}

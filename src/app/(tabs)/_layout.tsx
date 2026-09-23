import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { services } from '@/services';
import { useTheme } from '@/theme';

/**
 * Bottom tabs (SPEC §10): Home, Learn, Leaderboard, Profile.
 *
 * Leaderboard is hidden when the `leaderboard_enabled` flag is off (SPEC §10, §50).
 * Lesson player, practice, exam and paywall are full-screen routes outside this group,
 * so they render without a tab bar (and without banner ads).
 */
export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('navigation');
  const leaderboardEnabled = services.config.get('leaderboard_enabled');

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.textPrimary,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          // A hairline under a chunky UI looks like a rendering mistake.
          borderTopWidth: 2,
          // Setting a height replaces the one React Navigation computes, which is what
          // included the bottom safe area. A bare `64` put Android's gesture bar across
          // the tab labels on the first release-like build, so the inset is added back.
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
        },
        tabBarLabelStyle: { fontFamily: theme.fontFamily.semibold, fontSize: 12 },
        tabBarIconStyle: { marginTop: 2 },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          // Home draws its own header with the greeting and the quick toggles (SPEC §13),
          // so the navigator's would be the word "Home" twice.
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: t('tabs.learn'),
          tabBarIcon: ({ color, size }) => <Ionicons name="book" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: t('tabs.leaderboard'),
          href: leaderboardEnabled ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

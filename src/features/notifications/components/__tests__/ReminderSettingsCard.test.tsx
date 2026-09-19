import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '@/test-utils';
import type { UserProfile } from '@/services';

import { ReminderSettingsCard } from '../ReminderSettingsCard';
import { useNotificationStore } from '../../store';

/**
 * Reminders in Settings (SPEC §29, §48).
 *
 * The rule under test is the one that would otherwise cost somebody their streak: the switch
 * must never read "on" unless the OS will actually deliver something.
 */
const mockUpdate = jest.fn();
const mockRequestPermissions = jest.fn();
const mockCapture = jest.fn();

jest.mock('@/services', () => ({
  services: {
    profile: { update: (patch: unknown) => mockUpdate(patch) as unknown },
    notifications: { requestPermissions: () => mockRequestPermissions() as unknown },
    analytics: {
      capture: (event: unknown, props: unknown) => mockCapture(event, props) as unknown,
    },
  },
}));

const profile = (reminderTime: string | null): UserProfile => ({
  id: 'user-1',
  displayName: 'Ana',
  avatarKey: 'fox',
  birthYear: 1998,
  locale: 'en',
  timezone: 'Europe/Bucharest',
  experienceLevel: 'beginner',
  motivation: 'personal',
  dailyGoalMinutes: 5,
  reminderTime,
  onboardingCompleted: true,
  leaderboardHidden: false,
  analyticsConsent: false,
  adsConsentStatus: 'obtained',
  isAnonymous: false,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdate.mockResolvedValue(profile('18:00'));
  useNotificationStore.setState({ permission: { granted: true, canAskAgain: false } });
});

describe('ReminderSettingsCard', () => {
  it('shows reminders as on when a time is stored, with that time selected', async () => {
    await renderWithProviders(<ReminderSettingsCard profile={profile('20:00')} />);

    expect(screen.getByTestId('reminders-toggle')).toHaveProp('value', true);
    expect(screen.getByTestId('reminder-time-20:00')).toHaveProp('accessibilityState', {
      selected: true,
      disabled: false,
    });
  });

  it('offers no times while reminders are off', async () => {
    await renderWithProviders(<ReminderSettingsCard profile={profile(null)} />);

    expect(screen.getByTestId('reminders-toggle')).toHaveProp('value', false);
    expect(screen.queryByTestId('reminder-time-20:00')).toBeNull();
  });

  it('switching off clears the time — there is no second flag to disagree with it', async () => {
    await renderWithProviders(<ReminderSettingsCard profile={profile('20:00')} />);

    await fireEvent(screen.getByTestId('reminders-toggle'), 'valueChange', false);

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ reminderTime: null }));
  });

  it('switching on writes a time without asking again when permission is already granted', async () => {
    await renderWithProviders(<ReminderSettingsCard profile={profile(null)} />);

    await fireEvent(screen.getByTestId('reminders-toggle'), 'valueChange', true);

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ reminderTime: '18:00' }));
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  it('asks the OS when it has never been asked, and writes the time once granted', async () => {
    // Somebody who skipped the reminder step in onboarding. They have not refused anything,
    // so this is one tap and a dialogue — not a trip to system settings.
    useNotificationStore.setState({ permission: { granted: false, canAskAgain: true } });
    mockRequestPermissions.mockResolvedValue({ granted: true, canAskAgain: false });

    await renderWithProviders(<ReminderSettingsCard profile={profile(null)} />);

    expect(screen.getByTestId('reminders-toggle')).toHaveProp('disabled', false);
    expect(screen.queryByTestId('reminders-open-settings')).toBeNull();

    await fireEvent(screen.getByTestId('reminders-toggle'), 'valueChange', true);

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ reminderTime: '18:00' }));
    expect(mockCapture).toHaveBeenCalledWith('notification_permission_result', {
      granted: true,
      source: 'settings',
    });
  });

  it('writes nothing when the learner refuses the prompt', async () => {
    // A switch left "on" while the OS delivers nothing is the worst outcome here: the learner
    // believes they are being reminded and quietly loses their streak.
    useNotificationStore.setState({ permission: { granted: false, canAskAgain: true } });
    mockRequestPermissions.mockResolvedValue({ granted: false, canAskAgain: false });

    await renderWithProviders(<ReminderSettingsCard profile={profile(null)} />);
    await fireEvent(screen.getByTestId('reminders-toggle'), 'valueChange', true);

    // The refusal comes back with `canAskAgain: false`, which is exactly the state that turns
    // this card into "go to system settings" — so waiting for that button both settles the
    // permission read and asserts what a refusal actually leaves behind.
    await waitFor(() => expect(screen.getByTestId('reminders-open-settings')).toBeOnTheScreen());

    expect(screen.getByTestId('reminders-toggle')).toHaveProp('value', false);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCapture).toHaveBeenCalledWith('notification_permission_result', {
      granted: false,
      source: 'settings',
    });
  });

  it('sends the learner to system settings once the OS will no longer ask', async () => {
    useNotificationStore.setState({ permission: { granted: false, canAskAgain: false } });

    await renderWithProviders(<ReminderSettingsCard profile={profile(null)} />);

    // Disabled rather than silently doing nothing: requesting again would return the stored
    // refusal without showing a dialogue, which reads as a broken switch.
    expect(screen.getByTestId('reminders-toggle')).toHaveProp('disabled', true);
    expect(screen.getByTestId('reminders-open-settings')).toBeOnTheScreen();
  });

  it('changing the time writes that time', async () => {
    await renderWithProviders(<ReminderSettingsCard profile={profile('08:00')} />);

    await fireEvent.press(screen.getByTestId('reminder-time-21:30'));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ reminderTime: '21:30' }));
  });

  it('keeps the time the learner had when reminders are switched off and on again', async () => {
    const { rerender } = await renderWithProviders(
      <ReminderSettingsCard profile={profile('08:00')} />,
    );

    await fireEvent(screen.getByTestId('reminders-toggle'), 'valueChange', false);
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ reminderTime: null }));

    // Awaited, like render and fireEvent: in RNTL v14 these all wrap act(), and an
    // un-awaited one overlaps the next.
    await rerender(<ReminderSettingsCard profile={profile(null)} />);
    await fireEvent(screen.getByTestId('reminders-toggle'), 'valueChange', true);

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ reminderTime: '08:00' }));
  });
});

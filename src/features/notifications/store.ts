import { create } from 'zustand';

import type { NotificationPermission } from '@/services';

/**
 * Notification permission, as the device currently reports it (SPEC §0.1.3 — client state,
 * so Zustand rather than TanStack Query, which owns server state).
 *
 * It lives in one place because two screens act on it and they must not disagree: the
 * reconciler refuses to schedule anything without permission, and the Settings card refuses
 * to switch reminders on. If each kept its own copy, granting permission in Settings would
 * leave the reconciler believing it was still denied until the next app start.
 *
 * It is read from the OS, never decided here — including on every return to the foreground,
 * because permission can be withdrawn in system settings while the app is backgrounded.
 */
interface NotificationState {
  /** Null until the OS has been read. Not "denied": the difference matters to the UI. */
  permission: NotificationPermission | null;
  setPermission: (permission: NotificationPermission) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  permission: null,
  setPermission: (permission) => set({ permission }),
}));

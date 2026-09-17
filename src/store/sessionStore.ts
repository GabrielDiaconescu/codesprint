import { create } from 'zustand';

import type { AuthUser } from '@/services';

/**
 * Auth session mirror (SPEC §12).
 *
 * Nothing here is ever authoritative. It exists so the UI can render the right screen without
 * awaiting a round trip; entitlements, progress and every gameplay rule are decided on the
 * server (SPEC §31, §40). A client that lies to this store gains nothing.
 */
export type AuthStatus = 'loading' | 'signed-out' | 'guest' | 'authenticated';

export const statusForUser = (user: AuthUser | null): AuthStatus => {
  if (!user) return 'signed-out';
  return user.isAnonymous ? 'guest' : 'authenticated';
};

interface SessionState {
  status: AuthStatus;
  /** Supabase user id — the pseudonymous analytics distinct id (SPEC §43). */
  userId: string | null;
  email: string | null;
  emailConfirmed: boolean;
  /**
   * True between consuming a password-reset link and setting the new password.
   *
   * The recovery link establishes a real session, so without this flag the app would drop the
   * user straight onto Home — signed in, password still unknown to them, and with no way back
   * to the reset screen.
   */
  pendingPasswordReset: boolean;

  setUser: (user: AuthUser | null) => void;
  setStatus: (status: AuthStatus) => void;
  beginPasswordReset: () => void;
  completePasswordReset: () => void;
  reset: () => void;
}

const SIGNED_OUT = {
  status: 'signed-out',
  userId: null,
  email: null,
  emailConfirmed: false,
  pendingPasswordReset: false,
} as const;

export const useSessionStore = create<SessionState>((set) => ({
  ...SIGNED_OUT,
  status: 'loading',

  setUser: (user) =>
    set((state) => ({
      status: statusForUser(user),
      userId: user?.id ?? null,
      email: user?.email ?? null,
      emailConfirmed: user?.emailConfirmed ?? false,
      // Signing out cancels a pending reset; a token refresh must not.
      pendingPasswordReset: user ? state.pendingPasswordReset : false,
    })),

  setStatus: (status) => set({ status }),
  beginPasswordReset: () => set({ pendingPasswordReset: true }),
  completePasswordReset: () => set({ pendingPasswordReset: false }),
  reset: () => set({ ...SIGNED_OUT }),
}));

/** Selectors — components subscribe to one field, not the whole store (SPEC §45). */
export const selectIsSignedIn = (state: SessionState): boolean =>
  state.status === 'guest' || state.status === 'authenticated';

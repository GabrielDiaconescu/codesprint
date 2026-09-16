import { create } from 'zustand';

/**
 * Auth session mirror (SPEC §12).
 *
 * Phase 1 defines the shape only — Supabase Auth wires it up in Phase 4. Nothing here is
 * ever authoritative for access control: entitlements and gameplay state are server-side
 * (SPEC §31, §40).
 */
export type AuthStatus = 'loading' | 'signed-out' | 'guest' | 'authenticated';

interface SessionState {
  status: AuthStatus;
  /** Supabase user id — the pseudonymous analytics distinct id (SPEC §43). */
  userId: string | null;
  setStatus: (status: AuthStatus) => void;
  setUserId: (userId: string | null) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'loading',
  userId: null,
  setStatus: (status) => set({ status }),
  setUserId: (userId) => set({ userId }),
  reset: () => set({ status: 'signed-out', userId: null }),
}));

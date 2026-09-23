import * as Linking from 'expo-linking';

import { getSupabaseClient } from '../supabase/client';
import type {
  AuthChangeReason,
  AuthService,
  AuthUser,
  DeepLinkOutcome,
  SignUpResult,
} from '../types';

import { interpretAuthParams } from './deepLink';
import { toAuthErrorCode, toAuthFailure } from './errors';

/**
 * Supabase Auth (SPEC §12).
 *
 * Everything here throws `AuthFailure` with a mapped code, never a provider error, so no
 * screen ever has to know what Supabase calls a problem.
 *
 * The user shape is duck-typed rather than imported from the SDK, which keeps
 * `services/supabase/client.ts` the only module that touches `@supabase/supabase-js`.
 */

/** The fields of a provider user we depend on. */
interface ProviderUser {
  id: string;
  email?: string | null;
  is_anonymous?: boolean;
  email_confirmed_at?: string | null;
}

const toAuthUser = (user: ProviderUser | null | undefined): AuthUser | null =>
  user
    ? {
        id: user.id,
        email: user.email ?? null,
        isAnonymous: user.is_anonymous ?? false,
        emailConfirmed: Boolean(user.email_confirmed_at),
      }
    : null;

/**
 * Where the provider sends the user back to. `flow` is ours: Supabase does not distinguish a
 * signup confirmation from a password recovery in the callback, and the two must not land on
 * the same screen.
 *
 * Built at call time, not at module load, because the scheme differs per build variant
 * (codesprint-dev / codesprint-preview / codesprint) and is resolved from the app manifest.
 */
const redirectUrl = (flow: 'signup' | 'recovery'): string =>
  Linking.createURL('auth-callback', { queryParams: { flow } });

const REASON_BY_EVENT: Record<string, AuthChangeReason> = {
  INITIAL_SESSION: 'initial',
  SIGNED_IN: 'signed-in',
  SIGNED_OUT: 'signed-out',
  TOKEN_REFRESHED: 'token-refreshed',
  USER_UPDATED: 'user-updated',
  PASSWORD_RECOVERY: 'password-recovery',
};

export const SupabaseAuthService: AuthService = {
  serviceName: 'SupabaseAuthService',
  isNoop: false,

  async getUser() {
    // getSession() reads the persisted session and refreshes only if needed, so a cold start
    // with no network still restores the user instead of signing them out (SPEC §36).
    const { data, error } = await getSupabaseClient().auth.getSession();
    if (error) throw toAuthFailure(error);
    return toAuthUser(data.session?.user);
  },

  onChange(listener) {
    const { data } = getSupabaseClient().auth.onAuthStateChange((event, session) => {
      listener(toAuthUser(session?.user), REASON_BY_EVENT[event] ?? 'initial');
    });
    return () => data.subscription.unsubscribe();
  },

  async signInAnonymously() {
    const { data, error } = await getSupabaseClient().auth.signInAnonymously();
    if (error) throw toAuthFailure(error);

    const user = toAuthUser(data.user);
    if (!user) throw toAuthFailure({ code: 'unknown' });
    return user;
  },

  async signUp(email, password): Promise<SignUpResult> {
    const { data, error } = await getSupabaseClient().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl('signup') },
    });
    if (error) throw toAuthFailure(error);

    // When the address is already registered, Supabase deliberately returns a success with
    // no session rather than "email taken", so an attacker cannot enumerate accounts. We
    // keep that behaviour: the screen says "check your email" either way, and the real
    // owner of the address is the only one who learns anything.
    return { user: toAuthUser(data.user), needsConfirmation: data.session === null };
  },

  async signIn(email, password) {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
    if (error) throw toAuthFailure(error);

    const user = toAuthUser(data.user);
    if (!user) throw toAuthFailure({ code: 'unknown' });
    return user;
  },

  async linkEmail(email, password): Promise<SignUpResult> {
    // updateUser on the CURRENT anonymous session, which is what preserves the user id and
    // therefore every row of guest progress (SPEC §12). Creating a second account and
    // copying data would break foreign keys and double-count XP.
    const { data, error } = await getSupabaseClient().auth.updateUser(
      { email, password },
      { emailRedirectTo: redirectUrl('signup') },
    );
    if (error) throw toAuthFailure(error);

    // The account stays anonymous until the address is confirmed; only then does Supabase
    // clear is_anonymous, which our trigger mirrors onto profiles.
    return { user: toAuthUser(data.user), needsConfirmation: true };
  },

  async resendConfirmation(email, kind) {
    const { error } = await getSupabaseClient().auth.resend({
      type: kind,
      email,
      options: { emailRedirectTo: redirectUrl('signup') },
    });
    if (error) throw toAuthFailure(error);
  },

  async sendPasswordReset(email) {
    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl('recovery'),
    });
    if (error) throw toAuthFailure(error);
  },

  async updatePassword(newPassword) {
    const { error } = await getSupabaseClient().auth.updateUser({ password: newPassword });
    if (error) throw toAuthFailure(error);
  },

  async consumeAuthCallback(params): Promise<DeepLinkOutcome> {
    const parsed = interpretAuthParams(params);

    if (parsed.kind === 'none') return { kind: 'ignored' };
    if (parsed.kind === 'error') {
      return { kind: 'error', code: toAuthErrorCode({ code: parsed.errorCode }) };
    }

    // PKCE: the code is worthless without the verifier this install stored when it sent the
    // email, so a link opened on another device cannot take over the account.
    const { error } = await getSupabaseClient().auth.exchangeCodeForSession(parsed.code);
    if (error) return { kind: 'error', code: toAuthErrorCode(error) };

    return parsed.flow === 'recovery' ? { kind: 'recovery' } : { kind: 'signed-in' };
  },

  async signOut() {
    try {
      const { error } = await getSupabaseClient().auth.signOut();
      if (error) throw error;
    } catch {
      // A sign-out that fails server-side (expired or already-revoked token) has still
      // cleared the local session. Surfacing an error here would strand the user on a screen
      // they asked to leave, which is strictly worse than a token expiring on its own.
    }
  },

  setAppActive(active) {
    const auth = getSupabaseClient().auth;
    if (active) {
      void auth.startAutoRefresh();
    } else {
      void auth.stopAutoRefresh();
    }
  },
};

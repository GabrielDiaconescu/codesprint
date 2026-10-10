import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';

import { services, type AuthUser, type ConfirmationKind, type SignUpResult } from '@/services';
import { useSessionStore } from '@/store/sessionStore';

import { normalizeEmail } from '../logic/validation';

/**
 * Auth actions as mutations (SPEC §12).
 *
 * `useMutation` is used for the pending/error state a form needs, not for caching — auth is
 * imperative. Every address is normalised here rather than in each screen, so a capitalised
 * first letter from a mobile keyboard can never cause a "no account found".
 */

interface Credentials {
  email: string;
  password: string;
}

/** Callbacks a screen may add; the mutation function itself is never overridable. */
type Options<TData, TVariables> = Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>;

export const useSignIn = (options?: Options<AuthUser, Credentials>) =>
  useMutation<AuthUser, Error, Credentials>({
    ...options,
    mutationFn: ({ email, password }) => services.auth.signIn(normalizeEmail(email), password),
  });

export const useSignUp = (options?: Options<SignUpResult, Credentials>) =>
  useMutation<SignUpResult, Error, Credentials>({
    ...options,
    mutationFn: ({ email, password }) => services.auth.signUp(normalizeEmail(email), password),
  });

export const useContinueAsGuest = (options?: Options<AuthUser, void>) =>
  useMutation<AuthUser, Error, void>({
    ...options,
    mutationFn: () => services.auth.signInAnonymously(),
  });

/** Guest -> permanent account, keeping the same user id and therefore all progress. */
export const useLinkEmail = (options?: Options<SignUpResult, Credentials>) =>
  useMutation<SignUpResult, Error, Credentials>({
    ...options,
    mutationFn: ({ email, password }) => services.auth.linkEmail(normalizeEmail(email), password),
  });

export const useSendPasswordReset = (options?: Options<void, { email: string }>) =>
  useMutation<void, Error, { email: string }>({
    ...options,
    mutationFn: ({ email }) => services.auth.sendPasswordReset(normalizeEmail(email)),
  });

export const useResendConfirmation = (
  options?: Options<void, { email: string; kind: ConfirmationKind }>,
) =>
  useMutation<void, Error, { email: string; kind: ConfirmationKind }>({
    ...options,
    mutationFn: ({ email, kind }) => services.auth.resendConfirmation(normalizeEmail(email), kind),
  });

export const useUpdatePassword = (options?: Options<void, { password: string }>) => {
  const completePasswordReset = useSessionStore((state) => state.completePasswordReset);

  return useMutation<void, Error, { password: string }>({
    ...options,
    mutationFn: ({ password }) => services.auth.updatePassword(password),
    // Rest args rather than a fixed signature: the callback's arity has changed within v5,
    // and this hook only needs to run first and pass everything through untouched.
    onSuccess: (...args) => {
      completePasswordReset();
      options?.onSuccess?.(...args);
    },
  });
};

interface PasswordChange {
  currentPassword: string;
  newPassword: string;
}

/** Changing the password while signed in; every other device is signed out (SPEC §29). */
export const useChangePassword = (options?: Options<void, PasswordChange>) =>
  useMutation<void, Error, PasswordChange>({
    ...options,
    mutationFn: ({ currentPassword, newPassword }) =>
      services.auth.changePassword(currentPassword, newPassword),
  });

export const useSignOut = (options?: Options<void, void>) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    ...options,
    mutationFn: () => services.auth.signOut(),
    onSuccess: (...args) => {
      // Every cached query is scoped to a user id. Leaving them in place would show the
      // previous account's data for a frame after the next sign-in (SPEC §40).
      queryClient.clear();
      options?.onSuccess?.(...args);
    },
  });
};

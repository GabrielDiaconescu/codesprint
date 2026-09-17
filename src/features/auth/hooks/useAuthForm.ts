import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AuthFailure, toAuthErrorCode } from '@/services';

import {
  validateEmail,
  validatePassword,
  type EmailProblem,
  type PasswordProblem,
} from '../logic/validation';

/**
 * Turns whatever a mutation rejected with into a sentence (SPEC §46).
 *
 * Every screen uses this instead of rendering `error.message`: provider messages are
 * English-only and can leak implementation detail.
 */
export const useAuthErrorText = () => {
  const { t } = useTranslation('auth');

  return useCallback(
    (error: unknown): string | null => {
      if (!error) return null;
      const code = error instanceof AuthFailure ? error.code : toAuthErrorCode(error);
      return t(`errors.${code}`);
    },
    [t],
  );
};

interface CredentialsForm {
  email: string;
  password: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  emailError: string | null;
  passwordError: string | null;
  isValid: boolean;
  /** Runs the action only if the form is valid; otherwise reveals the field errors. */
  submit: (action: (credentials: { email: string; password: string }) => void) => void;
}

/**
 * Email + password form state.
 *
 * Field errors stay hidden until the first submit attempt. Validating while the user types
 * means telling someone their email is invalid after they have entered one character, which
 * reads as the form arguing with them.
 */
export const useCredentialsForm = (options?: { requirePassword?: boolean }): CredentialsForm => {
  const requirePassword = options?.requirePassword ?? true;
  const { t } = useTranslation('auth');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [attempted, setAttempted] = useState(false);

  const emailProblem: EmailProblem | null = validateEmail(email);
  const passwordProblem: PasswordProblem | null = requirePassword
    ? validatePassword(password)
    : null;

  const isValid = emailProblem === null && passwordProblem === null;

  const submit = useCallback(
    (action: (credentials: { email: string; password: string }) => void) => {
      setAttempted(true);
      if (emailProblem === null && passwordProblem === null) action({ email, password });
    },
    [email, password, emailProblem, passwordProblem],
  );

  return useMemo(
    () => ({
      email,
      password,
      setEmail,
      setPassword,
      emailError: attempted && emailProblem ? t(`validation.email.${emailProblem}`) : null,
      passwordError:
        attempted && passwordProblem ? t(`validation.password.${passwordProblem}`) : null,
      isValid,
      submit,
    }),
    [email, password, attempted, emailProblem, passwordProblem, isValid, submit, t],
  );
};

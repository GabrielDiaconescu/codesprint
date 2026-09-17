import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { haptics } from '@/lib/haptics';
import { services, type AnswerContext, type AnswerResult } from '@/services';
import { useSessionStore } from '@/store/sessionStore';

import { toSubmission, type AnswerValue } from '../types';

/**
 * Sends an answer to be graded (SPEC §18).
 *
 * No retry on failure: the selection is preserved in the form, and the learner retries with
 * the same Check button. An automatic retry could grade the same answer twice and record two
 * attempts for one tap. On a network error the server never saw the answer, so nothing has
 * been deducted or recorded — exactly the guarantee §18 asks for.
 */
export const useSubmitAnswer = (context: AnswerContext = 'lesson') => {
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();
  const userId = useSessionStore((state) => state.userId);

  return useMutation<AnswerResult, Error, { questionId: string; value: AnswerValue }>({
    mutationFn: ({ questionId, value }) =>
      services.content.submitAnswer(questionId, toSubmission(value), context, i18n.language),
    retry: false,
    onSuccess: (result) => {
      if (result.correct) {
        haptics.correct();
      } else {
        haptics.incorrect();
      }
      // XP and attempts changed on the server; anything showing them is now stale.
      if (userId) void queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
  });
};

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { queryKeys } from '@/lib/queryClient';
import { services, type ExamOverview, type ExamPaper, type ExamResults } from '@/services';
import { useSessionStore } from '@/store/sessionStore';

/**
 * The exam list (SPEC §27).
 *
 * Short `staleTime`: this screen carries attempt counts, the best score and the open attempt,
 * all of which change the moment a learner finishes an exam and comes back.
 */
export const useExamOverview = () => {
  const { i18n } = useTranslation();
  const userId = useSessionStore((state) => state.userId);

  return useQuery<ExamOverview>({
    queryKey: queryKeys.user.exams(userId ?? 'none', i18n.language),
    queryFn: () => services.exams.getOverview(i18n.language),
    enabled: userId !== null,
    staleTime: 15_000,
  });
};

/**
 * Starts or resumes an attempt.
 *
 * A mutation rather than a query, and deliberately not retried: `start_exam` creates an
 * attempt, and although resuming makes a repeat harmless, a silent retry on a timeout is not
 * something to rely on for an action with a clock attached.
 */
export const useStartExam = () => {
  const { i18n } = useTranslation();

  return useMutation<ExamPaper, Error, string>({
    mutationFn: (examId) => services.exams.start(examId, i18n.language),
    retry: 0,
  });
};

/**
 * Saves answers as the learner moves through the paper.
 *
 * Failures are swallowed on purpose. This is a background save whose only job is to make a
 * crash survivable; the submission still carries every answer, so a lost save costs nothing
 * unless the app dies immediately afterwards — and an error toast mid-exam would cost more.
 */
export const useSaveExamProgress = () =>
  useMutation<void, Error, { attemptId: string; answers: Record<string, unknown> }>({
    mutationFn: ({ attemptId, answers }) => services.exams.saveProgress(attemptId, answers),
    retry: 1,
    onError: () => {
      /* Intentionally silent — see above. */
    },
  });

/**
 * Submits the exam.
 *
 * Retried once, because submission is idempotent server-side (`submitted_at` is checked
 * first) and losing a finished 45-minute exam to one dropped response would be far worse
 * than sending it twice.
 */
export const useSubmitExam = () => {
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();
  const userId = useSessionStore((state) => state.userId);

  return useMutation<ExamResults, Error, { attemptId: string; answers: Record<string, unknown> }>({
    mutationFn: ({ attemptId, answers }) =>
      services.exams.submit(attemptId, answers, i18n.language),
    retry: 1,
    onSuccess: () => {
      // XP, level, streak, achievements and the exam list all move on submission.
      if (userId) void queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
  });
};

/** Reopens a graded attempt — from a results screen the app was killed on, or from history. */
export const useExamResults = (attemptId: string | null) => {
  const { i18n } = useTranslation();
  const userId = useSessionStore((state) => state.userId);

  return useQuery<ExamResults>({
    queryKey: queryKeys.user.examResults(userId ?? 'none', attemptId ?? 'none'),
    queryFn: () => services.exams.getResults(attemptId ?? '', i18n.language),
    enabled: userId !== null && attemptId !== null,
    // A graded attempt is immutable, so this never needs refetching.
    staleTime: Infinity,
  });
};

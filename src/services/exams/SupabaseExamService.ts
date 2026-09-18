import type { Json } from '@/types/database.types';

import { getSupabaseClient } from '../supabase/client';
import type { ExamService } from '../types';

import { ExamUnavailable, toExamUnavailableReason } from './errors';
import { examOverview, examPaper, examResults } from './schema';

/**
 * Exam mode (SPEC §27).
 *
 * Every call is an RPC. The client never reads `questions` or `exam_attempts` directly — it
 * could not: RLS limits attempts to the caller's own rows and questions to nobody, and the
 * paper is assembled by a security-definer function that decides what is safe to send.
 *
 * Note what this service does NOT have: a grading method. Answers are collected locally,
 * saved as the learner moves through the paper, and marked in one place, on the server, when
 * the exam is submitted.
 */
export const SupabaseExamService: ExamService = {
  serviceName: 'SupabaseExamService',
  isNoop: false,

  async getOverview(locale) {
    const { data, error } = await getSupabaseClient().rpc('get_exam_overview', {
      p_locale: locale,
    });
    if (error) throw error;
    return examOverview.parse(data);
  },

  async start(examId, locale) {
    const { data, error } = await getSupabaseClient().rpc('start_exam', {
      p_exam_id: examId,
      p_locale: locale,
    });
    // Every refusal here is a product rule the screen has copy for — the paywall, the weekly
    // limit, the cooldown — so it arrives typed rather than as a raw PostgREST error.
    if (error) throw new ExamUnavailable(toExamUnavailableReason(error), error);
    return examPaper.parse(data);
  },

  async saveProgress(attemptId, answers) {
    const { error } = await getSupabaseClient().rpc('save_exam_progress', {
      p_attempt_id: attemptId,
      // Built by `toSubmission`, so this really is JSON; the generated client types just
      // describe it more narrowly than `Record<string, unknown>` does.
      p_answers: answers as Json,
    });
    if (error) throw error;
  },

  async submit(attemptId, answers, locale) {
    const { data, error } = await getSupabaseClient().rpc('submit_exam', {
      p_attempt_id: attemptId,
      p_answers: answers as Json,
      p_locale: locale,
    });
    if (error) throw error;
    return examResults.parse(data);
  },

  async getResults(attemptId, locale) {
    const { data, error } = await getSupabaseClient().rpc('get_exam_results', {
      p_attempt_id: attemptId,
      p_locale: locale,
    });
    if (error) throw error;
    return examResults.parse(data);
  },
};

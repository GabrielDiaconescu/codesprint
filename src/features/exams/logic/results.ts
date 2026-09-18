import type { ExamResults, ExamSummary } from '@/services';

/**
 * Reading an exam result (SPEC §27, §28).
 *
 * Pure, because the interesting cases are the awkward ones — a perfect score, a paper with no
 * skill tags, a learner one question below the threshold — and none of them should need a
 * device and a 45-minute sitting to check.
 */

export interface SkillScore {
  tag: string;
  pct: number;
}

/**
 * The weakest skills on this paper, worst first.
 *
 * "Weak areas" is the one part of a results page a learner can act on, so it is deliberately
 * short: three things to go and revise, not a table of everything they touched. A skill they
 * got right is not a weak area, so anything at 100% is left out entirely.
 */
export const weakestSkills = (results: ExamResults, limit = 3): SkillScore[] =>
  Object.entries(results.skill_breakdown)
    .map(([tag, pct]) => ({ tag, pct }))
    .filter((skill) => skill.pct < 100)
    .sort((a, b) => a.pct - b.pct || a.tag.localeCompare(b.tag))
    .slice(0, limit);

/** The skills fully answered, best first — the other half of the picture. */
export const strongestSkills = (results: ExamResults, limit = 3): SkillScore[] =>
  Object.entries(results.skill_breakdown)
    .map(([tag, pct]) => ({ tag, pct }))
    .filter((skill) => skill.pct === 100)
    .sort((a, b) => a.tag.localeCompare(b.tag))
    .slice(0, limit);

/**
 * How far off a pass, in questions rather than percent.
 *
 * "You needed two more" is something a learner can hold on to; "you scored 63.33%, the
 * threshold is 70%" is arithmetic homework. Zero once they have passed.
 */
export const questionsShortOfPass = (results: ExamResults): number => {
  if (results.passed || results.question_count === 0) return 0;

  const needed = Math.ceil((results.pass_threshold_pct / 100) * results.question_count);
  return Math.max(needed - results.correct_count, 0);
};

/** Marking, never by colour alone (SPEC §47) — the tone always travels with a label. */
export const resultTone = (results: ExamResults): 'success' | 'warning' =>
  results.passed ? 'success' : 'warning';

/**
 * What the button on an exam card should offer.
 *
 * Four states, and they are not interchangeable: an attempt already open is resumed rather
 * than restarted, a locked exam explains itself instead of pretending to be startable, and a
 * learner who has passed is offered an improvement rather than a repeat of the same pitch.
 */
export type ExamAction = 'resume' | 'start' | 'retry' | 'locked';

export const examAction = (exam: ExamSummary): ExamAction => {
  if (exam.open_attempt_id !== null) return 'resume';
  if (exam.unavailable_reason !== null) return 'locked';
  return exam.attempts_taken > 0 ? 'retry' : 'start';
};

/**
 * Where a resumed paper should open.
 *
 * The first question with nothing saved against it — which is where the learner was when the
 * app died. A paper with every question answered opens at the last one, ready to hand in,
 * rather than wrapping round to the start.
 */
export const firstUnansweredIndex = (
  questionIds: string[],
  savedAnswers: Record<string, unknown>,
): number => {
  const index = questionIds.findIndex((id) => !(id in savedAnswers));
  if (index !== -1) return index;
  return Math.max(questionIds.length - 1, 0);
};

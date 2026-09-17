import type { LessonBlock, RenderableQuestion } from '@/services';

/**
 * Turns a lesson's flat block list into the pages the player steps through (SPEC §15, §18).
 *
 * Consecutive explanation blocks become one reading page, so a text, a code example and a
 * callout that belong together are read together. Every question is its own page, because
 * answering needs the screen: the renderer, the Check button and the feedback panel.
 *
 * Pure, so the page structure — and therefore the progress bar — is unit-tested rather than
 * inferred from a scroll position.
 */

export type LessonPage =
  | { kind: 'reading'; blocks: Exclude<LessonBlock, { type: 'question' }>[] }
  | { kind: 'question'; question: RenderableQuestion; number: number };

export const buildLessonPages = (blocks: LessonBlock[]): LessonPage[] => {
  const pages: LessonPage[] = [];
  let reading: Exclude<LessonBlock, { type: 'question' }>[] = [];
  let questionNumber = 0;

  const flushReading = () => {
    if (reading.length > 0) {
      pages.push({ kind: 'reading', blocks: reading });
      reading = [];
    }
  };

  for (const block of blocks) {
    if (block.type === 'question') {
      flushReading();
      questionNumber += 1;
      pages.push({ kind: 'question', question: block.question, number: questionNumber });
    } else {
      reading.push(block);
    }
  }
  flushReading();

  return pages;
};

export const countQuestions = (pages: LessonPage[]): number =>
  pages.filter((page) => page.kind === 'question').length;

/** 0 to 1: how far through the pages the learner is, with the last page reading as complete. */
export const pageProgress = (index: number, total: number): number => {
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, (index + 1) / total));
};

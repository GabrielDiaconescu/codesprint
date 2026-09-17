import type { LessonBlock, RenderableQuestion } from '@/services';

import { buildLessonPages, countQuestions, pageProgress } from '../pages';

const question = (id: string): RenderableQuestion => ({
  id,
  type: 'true_false',
  difficulty: 'easy',
  prompt: 'Prompt',
  code_snippet: null,
  payload: {},
  has_hint: false,
  skill_tags: ['tag'],
});

const text: LessonBlock = { type: 'text', body: 'Some prose.' };
const code: LessonBlock = { type: 'code', code: 'print(1)', output: '1' };
const callout: LessonBlock = { type: 'callout', variant: 'tip', body: 'Tip.' };
const q = (id: string): LessonBlock => ({ type: 'question', question: question(id) });

describe('buildLessonPages', () => {
  it('groups consecutive explanation blocks into one reading page', () => {
    const pages = buildLessonPages([text, code, callout]);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toEqual({ kind: 'reading', blocks: [text, code, callout] });
  });

  it('gives every question its own page', () => {
    const pages = buildLessonPages([text, q('a'), q('b')]);
    expect(pages.map((p) => p.kind)).toEqual(['reading', 'question', 'question']);
  });

  it('numbers questions from one, in order', () => {
    const pages = buildLessonPages([q('a'), text, q('b'), text, q('c')]);
    const numbers = pages.filter((p) => p.kind === 'question').map((p) => (p as { number: number }).number);
    expect(numbers).toEqual([1, 2, 3]);
  });

  it('starts a fresh reading page after a question', () => {
    const pages = buildLessonPages([text, q('a'), code, callout]);
    expect(pages).toHaveLength(3);
    expect(pages[2]).toEqual({ kind: 'reading', blocks: [code, callout] });
  });

  it('preserves the order of every block', () => {
    const pages = buildLessonPages([text, code, q('a'), callout]);
    expect(pages[0]).toEqual({ kind: 'reading', blocks: [text, code] });
    expect(pages[1]?.kind).toBe('question');
    expect(pages[2]).toEqual({ kind: 'reading', blocks: [callout] });
  });

  it('produces no pages for no blocks', () => {
    expect(buildLessonPages([])).toEqual([]);
  });
});

describe('countQuestions', () => {
  it('counts only question pages', () => {
    expect(countQuestions(buildLessonPages([text, q('a'), text, q('b')]))).toBe(2);
    expect(countQuestions(buildLessonPages([text, code]))).toBe(0);
  });
});

describe('pageProgress', () => {
  it('reaches exactly 1 on the last page', () => {
    // A bar that stops short on the final page reads as "there is more".
    expect(pageProgress(3, 4)).toBe(1);
  });

  it('is above zero on the first page', () => {
    expect(pageProgress(0, 4)).toBeGreaterThan(0);
  });

  it('increases monotonically', () => {
    const values = [0, 1, 2, 3].map((i) => pageProgress(i, 4));
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  it('treats an empty lesson as complete', () => {
    expect(pageProgress(0, 0)).toBe(1);
  });

  it('never exceeds the range', () => {
    expect(pageProgress(10, 4)).toBe(1);
    expect(pageProgress(-1, 4)).toBe(0);
  });
});

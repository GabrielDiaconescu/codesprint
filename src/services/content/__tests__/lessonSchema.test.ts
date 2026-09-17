import { lessonResponse, renderableQuestion } from '../lessonSchema';

/**
 * `get_lesson` assembles its response by hand in SQL, so this schema is the one place that
 * checks the assembly. It is `.strict()` on purpose: if a future change to the RPC started
 * including explanations, the parse would fail here rather than the app quietly rendering the
 * answer to a question the learner has not attempted.
 */

const question = {
  id: 'q-1',
  type: 'true_false',
  difficulty: 'easy',
  prompt: 'Python runs top to bottom.',
  code_snippet: null,
  payload: {},
  has_hint: false,
  skill_tags: ['python-basics'],
};

const lesson = {
  id: 'l-1',
  slug: 'what-is-python',
  title: 'What is Python?',
  summary: 'Where Python fits.',
  estimated_minutes: 4,
  order_index: 1,
  module: { id: 'm-1', slug: 'getting-started', title: 'Getting Started', order_index: 1 },
  blocks: [
    { type: 'text', body: 'Python is a programming language.' },
    { type: 'code', code: 'print("hi")\n', output: 'hi', runnable: true },
    { type: 'callout', variant: 'note', body: 'Worth knowing.' },
    { type: 'question', question },
  ],
};

describe('lessonResponse', () => {
  it('accepts a well-formed lesson', () => {
    expect(lessonResponse.parse(lesson).blocks).toHaveLength(4);
  });

  it('accepts a lesson with no blocks at all', () => {
    // A lesson whose questions were all withdrawn still has to render something.
    expect(lessonResponse.parse({ ...lesson, blocks: [] }).blocks).toEqual([]);
  });

  it('rejects an unknown block type rather than rendering a hole', () => {
    const result = lessonResponse.safeParse({
      ...lesson,
      blocks: [{ type: 'video', url: 'https://example.com' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing module', () => {
    const { module: _omitted, ...withoutModule } = lesson;
    expect(lessonResponse.safeParse(withoutModule).success).toBe(false);
  });

  describe('the fields that must never arrive', () => {
    it('rejects a question carrying an explanation', () => {
      const result = lessonResponse.safeParse({
        ...lesson,
        blocks: [{ type: 'question', question: { ...question, explanation: 'Because.' } }],
      });
      expect(result.success).toBe(false);
    });

    it('rejects a question carrying a hint', () => {
      const result = lessonResponse.safeParse({
        ...lesson,
        blocks: [{ type: 'question', question: { ...question, hint: 'Think about it.' } }],
      });
      expect(result.success).toBe(false);
    });

    it('rejects a question carrying an answer', () => {
      const result = lessonResponse.safeParse({
        ...lesson,
        blocks: [{ type: 'question', question: { ...question, answer: { value: true } } }],
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('renderableQuestion', () => {
  it('keeps has_hint, which is what decides whether the hint button appears', () => {
    expect(renderableQuestion.parse({ ...question, has_hint: true }).has_hint).toBe(true);
  });

  it('allows a null code snippet, since most types have none', () => {
    expect(renderableQuestion.parse(question).code_snippet).toBeNull();
  });

  it('accepts every V1 question type', () => {
    const types = [
      'multiple_choice',
      'multiple_select',
      'true_false',
      'predict_output',
      'fill_blank',
      'code_ordering',
      'debugging',
      'concept_matching',
    ];

    for (const type of types) {
      expect(renderableQuestion.safeParse({ ...question, type }).success).toBe(true);
    }
  });

  it('rejects a type no renderer exists for', () => {
    expect(renderableQuestion.safeParse({ ...question, type: 'essay' }).success).toBe(false);
  });
});

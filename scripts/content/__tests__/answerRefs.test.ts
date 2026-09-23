import type { ContentQuestion } from '../../../src/lib/content/schema';
import { answerReferenceProblems, normalizeAnswerText } from '../answerRefs';

/**
 * Answers that point at nothing (Phase 19).
 *
 * Every case below parses under the schema, publishes, and renders. Each one is then graded
 * wrong for every learner who answers correctly, and nothing anywhere would say so. That is
 * the whole reason this rule exists, so each failure mode gets its own test.
 */

const base = {
  id: '00000000-0000-4000-8000-000000000001',
  difficulty: 'easy' as const,
  prompt: { en: 'Pick one.' },
  explanation: { en: 'Because.' },
  skill_tags: ['testing'],
  is_premium: false,
  is_challenge_eligible: true,
  is_exam_eligible: true,
  review_status: 'draft' as const,
};

const opt = (id: string, text = id) => ({ id, text: { en: text } });

// The fixtures are built as plain objects and asserted to the schema type: Zod defaults would
// fill some fields on parse, and the rule only ever sees parsed questions.
const q = (fields: Record<string, unknown>) => ({ ...base, ...fields }) as ContentQuestion;

describe('normalizeAnswerText mirrors the server', () => {
  it('straightens typographic quotes and dashes in every mode', () => {
    expect(normalizeAnswerText('“hi” — it’s', 'exact')).toBe('"hi" - it\'s');
  });

  it('trims only spaces, tabs and newlines, as Postgres btrim does', () => {
    expect(normalizeAnswerText('\n 42 \t', 'trimmed')).toBe('42');
    expect(normalizeAnswerText(' 42', 'trimmed')).toBe(' 42');
  });

  it('collapses inner whitespace only when asked to', () => {
    expect(normalizeAnswerText('a   b\nc', 'whitespace_insensitive')).toBe('a b c');
    expect(normalizeAnswerText('a   b', 'trimmed')).toBe('a   b');
  });

  it('lower-cases only in case_insensitive', () => {
    expect(normalizeAnswerText(' True ', 'case_insensitive')).toBe('true');
    expect(normalizeAnswerText('True', 'exact')).toBe('True');
  });
});

describe('answerReferenceProblems', () => {
  it('accepts a well-formed question of every checked type', () => {
    const good: ContentQuestion[] = [
      q({
        type: 'multiple_choice',
        payload: { options: [opt('a'), opt('b')] },
        answer: { option_id: 'a' },
      }),
      q({
        type: 'multiple_select',
        payload: { options: [opt('a'), opt('b'), opt('c')] },
        answer: { option_ids: ['a', 'b'] },
      }),
      q({
        type: 'predict_output',
        code_snippet: 'print(1)\nprint(2)',
        payload: { input: 'choice', options: [opt('right', '1\n2'), opt('wrong', '1 2')] },
        answer: { value: '1\n2', match_mode: 'exact', accepted_answers: [] },
        runnable: true,
      }),
      q({
        type: 'fill_blank',
        code_snippet: 'print(___)',
        payload: { input: 'tokens', tokens: ['len', 'str'] },
        answer: { value: 'len', match_mode: 'trimmed', accepted_answers: [] },
      }),
      q({
        type: 'code_ordering',
        payload: {
          lines: [
            { id: 'a', text: 'x = 1' },
            { id: 'b', text: 'y = 2' },
            { id: 'c', text: 'print(x)' },
          ],
        },
        answer: { order: ['a', 'b', 'c'] },
        runnable: false,
      }),
      q({
        type: 'debugging',
        code_snippet: 'x = 1\nprint(y)',
        payload: {
          mode: 'both',
          lines: [
            { id: 'l1', text: 'x = 1' },
            { id: 'l2', text: 'print(y)' },
          ],
          options: [opt('f1'), opt('f2')],
        },
        answer: { line_id: 'l2', option_id: 'f1' },
        runnable: false,
      }),
      q({
        type: 'concept_matching',
        payload: {
          concepts: [opt('c1'), opt('c2'), opt('c3')],
          definitions: [opt('d1'), opt('d2'), opt('d3')],
        },
        answer: { pairs: { c1: 'd1', c2: 'd2', c3: 'd3' } },
      }),
      q({ type: 'true_false', answer: { value: true } }),
    ];

    for (const question of good) {
      expect({ type: question.type, problems: answerReferenceProblems(question) }).toEqual({
        type: question.type,
        problems: [],
      });
    }
  });

  it('catches a multiple_choice answer that is a typo for an option', () => {
    const problems = answerReferenceProblems(
      q({
        type: 'multiple_choice',
        payload: { options: [opt('alpha'), opt('beta')] },
        answer: { option_id: 'alfa' },
      }),
    );
    expect(problems.join()).toMatch(/"alfa" is not one of the options/);
  });

  it('catches two options sharing an id, which makes a pick ambiguous', () => {
    const problems = answerReferenceProblems(
      q({
        type: 'multiple_choice',
        payload: { options: [opt('a'), opt('a', 'other')] },
        answer: { option_id: 'a' },
      }),
    );
    expect(problems.join()).toMatch(/two options share the id "a"/);
  });

  it('refuses a multiple_select where every option is correct', () => {
    const problems = answerReferenceProblems(
      q({
        type: 'multiple_select',
        payload: { options: [opt('a'), opt('b'), opt('c')] },
        answer: { option_ids: ['a', 'b', 'c'] },
      }),
    );
    expect(problems.join()).toMatch(/nothing to decide/);
  });

  it('catches a choice predict_output whose right option differs by one character', () => {
    // The trap this rule was written for: the option reads the same, the server disagrees.
    const problems = answerReferenceProblems(
      q({
        type: 'predict_output',
        code_snippet: 'print("a", "b")',
        payload: { input: 'choice', options: [opt('one', 'a  b'), opt('two', 'ab')] },
        answer: { value: 'a b', match_mode: 'exact', accepted_answers: [] },
        runnable: true,
      }),
    );
    expect(problems.join()).toMatch(/no option matches answer\.value/);
  });

  it('catches two options that both normalise to the answer', () => {
    const problems = answerReferenceProblems(
      q({
        type: 'predict_output',
        code_snippet: 'print(1)',
        payload: { input: 'choice', options: [opt('plain', '1'), opt('padded', ' 1 ')] },
        answer: { value: '1', match_mode: 'trimmed', accepted_answers: [] },
        runnable: true,
      }),
    );
    expect(problems.join()).toMatch(/2 options match/);
  });

  it('leaves a free-text predict_output alone — there are no options to point at', () => {
    const problems = answerReferenceProblems(
      q({
        type: 'predict_output',
        code_snippet: 'print(1)',
        payload: { input: 'text' },
        answer: { value: '1', match_mode: 'trimmed', accepted_answers: [] },
        runnable: true,
      }),
    );
    expect(problems).toEqual([]);
  });

  it('catches a fill_blank whose answer is not in the token bank', () => {
    const problems = answerReferenceProblems(
      q({
        type: 'fill_blank',
        code_snippet: 'print(___(x))',
        payload: { input: 'tokens', tokens: ['str', 'int'] },
        answer: { value: 'len', match_mode: 'trimmed', accepted_answers: [] },
      }),
    );
    expect(problems.join()).toMatch(/"len" is not one of the tokens/);
  });

  it('catches a code_ordering answer that drops, invents or repeats a line', () => {
    const lines = [
      { id: 'a', text: 'a' },
      { id: 'b', text: 'b' },
      { id: 'c', text: 'c' },
    ];
    const problems = answerReferenceProblems(
      q({
        type: 'code_ordering',
        payload: { lines },
        answer: { order: ['a', 'a', 'z'] },
        runnable: false,
      }),
    ).join();

    expect(problems).toMatch(/"z", which is not one of the lines/);
    expect(problems).toMatch(/line "b" is missing/);
    expect(problems).toMatch(/lists "a" twice/);
  });

  it('catches a debugging answer pointing at a line or fix that is not there', () => {
    const problems = answerReferenceProblems(
      q({
        type: 'debugging',
        code_snippet: 'x',
        payload: {
          mode: 'both',
          lines: [
            { id: 'l1', text: 'x' },
            { id: 'l2', text: 'y' },
          ],
          options: [opt('f1'), opt('f2')],
        },
        answer: { line_id: 'l9', option_id: 'f9' },
        runnable: false,
      }),
    ).join();

    expect(problems).toMatch(/line_id "l9"/);
    expect(problems).toMatch(/option_id "f9"/);
  });

  it('catches concept_matching pairs that are incomplete, invented or not one-to-one', () => {
    const problems = answerReferenceProblems(
      q({
        type: 'concept_matching',
        payload: {
          concepts: [opt('c1'), opt('c2'), opt('c3')],
          definitions: [opt('d1'), opt('d2'), opt('d3')],
        },
        answer: { pairs: { c1: 'd1', c2: 'd1', c9: 'd7' } },
      }),
    ).join();

    expect(problems).toMatch(/concept "c3" has no pair/);
    expect(problems).toMatch(/pairs "c9", which is not one of the concepts/);
    expect(problems).toMatch(/uses "d7"/);
    expect(problems).toMatch(/"d1" is the answer for two concepts/);
  });
});

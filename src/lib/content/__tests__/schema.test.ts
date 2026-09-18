import { QUESTION_TYPES, anyBlock, lessonFile, questionSchema } from '../schema';

/**
 * The authoring format is the last line of defence before content reaches the database.
 * These tests pin the rules that are easy to get wrong when writing YAML at speed, and the
 * one rule that matters more than all the others: an answer must never be reachable from the
 * part of a question the client is served.
 */

const baseFields = {
  difficulty: 'easy',
  prompt: { en: 'A question' },
  explanation: { en: 'Because that is how it works, and here is why.' },
  skill_tags: ['printing'],
};

const id = (suffix: string) => `00000000-0000-4000-8000-0000000000${suffix}`;

describe('question types', () => {
  it('covers every type the app can render', () => {
    expect(QUESTION_TYPES).toHaveLength(8);
  });

  it('rejects an unknown type outright', () => {
    const result = questionSchema.safeParse({
      ...baseFields,
      id: id('01'),
      type: 'essay',
      payload: {},
      answer: { value: true },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown key rather than silently ignoring it', () => {
    // `explaination:` would otherwise publish a question with no explanation at all.
    const result = questionSchema.safeParse({
      ...baseFields,
      id: id('02'),
      type: 'true_false',
      payload: {},
      answer: { value: true },
      explaination: { en: 'typo' },
    });
    expect(result.success).toBe(false);
  });

  it('requires a stable UUID', () => {
    const result = questionSchema.safeParse({
      ...baseFields,
      id: 'question-1',
      type: 'true_false',
      payload: {},
      answer: { value: true },
    });
    expect(result.success).toBe(false);
  });
});

describe('the payload / answer split', () => {
  /**
   * `payload` is served to the client and `answer` is not. The schemas keep them in separate
   * fields so the publish step cannot confuse them, and the database carries a CHECK
   * constraint that rejects an answer-shaped key in `payload` as a second line of defence.
   */
  it('keeps the answer out of the payload for every type', () => {
    const samples = [
      {
        ...baseFields,
        id: id('10'),
        type: 'multiple_choice',
        payload: {
          options: [
            { id: 'a', text: { en: 'A' } },
            { id: 'b', text: { en: 'B' } },
          ],
        },
        answer: { option_id: 'a' },
      },
      {
        ...baseFields,
        id: id('11'),
        type: 'true_false',
        payload: {},
        answer: { value: true },
      },
    ];

    for (const sample of samples) {
      const parsed = questionSchema.parse(sample);
      const payloadKeys = Object.keys(parsed.payload);
      expect(payloadKeys).not.toContain('answer');
      expect(payloadKeys).not.toContain('correct');
      expect(payloadKeys).not.toContain('solution');
    }
  });
});

describe('predict_output', () => {
  const build = (overrides: Record<string, unknown>) =>
    questionSchema.safeParse({
      ...baseFields,
      id: id('20'),
      type: 'predict_output',
      code_snippet: 'print("hi")\n',
      payload: { input: 'text' },
      answer: { value: 'hi' },
      ...overrides,
    });

  it('accepts single-line free-text output', () => {
    expect(build({}).success).toBe(true);
  });

  it('refuses multi-line output as free text', () => {
    // SPEC §16: typing two lines exactly is a memory test, not a comprehension test.
    expect(build({ answer: { value: 'a\nb' } }).success).toBe(false);
  });

  it('accepts multi-line output when it is a choice', () => {
    const result = build({
      payload: {
        input: 'choice',
        options: [
          { id: 'both', text: { en: 'a\nb' } },
          { id: 'one', text: { en: 'ab' } },
        ],
      },
      answer: { value: 'a\nb' },
    });
    expect(result.success).toBe(true);
  });

  it('refuses a choice with no options to choose from', () => {
    expect(build({ payload: { input: 'choice' } }).success).toBe(false);
  });

  it('requires the code the learner is asked to read', () => {
    expect(build({ code_snippet: undefined }).success).toBe(false);
  });
});

describe('fill_blank', () => {
  const build = (overrides: Record<string, unknown>) =>
    questionSchema.safeParse({
      ...baseFields,
      id: id('30'),
      type: 'fill_blank',
      code_snippet: '___("hi")\n',
      payload: { input: 'tokens', tokens: ['print', 'show'] },
      answer: { value: 'print' },
      ...overrides,
    });

  it('accepts a well-formed token blank', () => {
    expect(build({}).success).toBe(true);
  });

  it('requires the blank marker in the snippet', () => {
    expect(build({ code_snippet: 'print("hi")\n' }).success).toBe(false);
  });

  it('requires the correct answer to be among the tokens', () => {
    // Otherwise the question is unanswerable, and no schema check below this would notice.
    expect(build({ payload: { input: 'tokens', tokens: ['show', 'display'] } }).success).toBe(
      false,
    );
  });
});

describe('code_ordering', () => {
  const lines = [
    { id: 'one', text: 'a = 1' },
    { id: 'two', text: 'b = 2' },
    { id: 'three', text: 'print(a + b)' },
  ];

  const build = (overrides: Record<string, unknown>) =>
    questionSchema.safeParse({
      ...baseFields,
      id: id('40'),
      type: 'code_ordering',
      payload: { lines },
      answer: { order: ['one', 'two', 'three'] },
      ...overrides,
    });

  it('accepts a complete ordering', () => {
    expect(build({}).success).toBe(true);
  });

  it('refuses an ordering that omits a line', () => {
    expect(build({ answer: { order: ['one', 'two'] } }).success).toBe(false);
  });

  it('refuses an ordering that repeats a line', () => {
    expect(build({ answer: { order: ['one', 'one', 'two'] } }).success).toBe(false);
  });

  it('refuses an ordering that names a line that does not exist', () => {
    expect(build({ answer: { order: ['one', 'two', 'four'] } }).success).toBe(false);
  });

  it('requires an expected output when it is marked runnable', () => {
    expect(build({ runnable: true }).success).toBe(false);
    expect(build({ runnable: true, expected_output: '3' }).success).toBe(true);
  });
});

describe('debugging', () => {
  const build = (overrides: Record<string, unknown>) =>
    questionSchema.safeParse({
      ...baseFields,
      id: id('50'),
      type: 'debugging',
      code_snippet: 'print(x)\n',
      payload: {
        mode: 'select_line',
        lines: [
          { id: 'a', text: 'print(x)' },
          { id: 'b', text: 'x = 1' },
        ],
      },
      answer: { line_id: 'a' },
      ...overrides,
    });

  it('accepts a line-selection question', () => {
    expect(build({}).success).toBe(true);
  });

  it('requires a line id when the learner selects a line', () => {
    expect(build({ answer: {} }).success).toBe(false);
  });

  it('requires options when the learner chooses a fix', () => {
    expect(build({ payload: { mode: 'choose_fix' }, answer: { option_id: 'a' } }).success).toBe(
      false,
    );
  });

  it('requires the fixed version when it is marked runnable', () => {
    // Without it the pipeline cannot prove there is actually a bug to find.
    expect(build({ runnable: true }).success).toBe(false);
    expect(
      build({ runnable: true, fixed_code: 'x = 1\nprint(x)\n', fixed_output: '1' }).success,
    ).toBe(true);
  });
});

describe('concept_matching', () => {
  const payload = {
    concepts: [
      { id: 'a', text: { en: 'A' } },
      { id: 'b', text: { en: 'B' } },
      { id: 'c', text: { en: 'C' } },
    ],
    definitions: [
      { id: 'x', text: { en: 'X' } },
      { id: 'y', text: { en: 'Y' } },
      { id: 'z', text: { en: 'Z' } },
    ],
  };

  const build = (pairs: Record<string, string>) =>
    questionSchema.safeParse({
      ...baseFields,
      id: id('60'),
      type: 'concept_matching',
      payload,
      answer: { pairs },
    });

  it('accepts a complete one-to-one matching', () => {
    expect(build({ a: 'x', b: 'y', c: 'z' }).success).toBe(true);
  });

  it('refuses leaving a concept unmatched', () => {
    expect(build({ a: 'x', b: 'y' }).success).toBe(false);
  });

  it('refuses two concepts sharing one definition', () => {
    expect(build({ a: 'x', b: 'x', c: 'z' }).success).toBe(false);
  });

  it('refuses a definition that does not exist', () => {
    expect(build({ a: 'x', b: 'y', c: 'nope' }).success).toBe(false);
  });
});

describe('code blocks', () => {
  it('requires the expected output when marked runnable', () => {
    expect(anyBlock.safeParse({ type: 'code', code: 'print(1)', runnable: true }).success).toBe(
      false,
    );
    expect(
      anyBlock.safeParse({ type: 'code', code: 'print(1)', runnable: true, output: '1' }).success,
    ).toBe(true);
  });

  it('allows a non-runnable snippet with no output', () => {
    // Fragments and deliberately broken examples cannot be executed.
    expect(anyBlock.safeParse({ type: 'code', code: 'print("hi"' }).success).toBe(true);
  });
});

describe('lesson files', () => {
  it('requires English text in every localized field', () => {
    const result = lessonFile.safeParse({
      id: id('70'),
      slug: 'a-lesson',
      title: { ro: 'Lecție' },
      estimated_minutes: 5,
      blocks: [{ type: 'text', body: { en: 'Hello' } }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts additional locales alongside English', () => {
    const result = lessonFile.safeParse({
      id: id('71'),
      slug: 'a-lesson',
      title: { en: 'A lesson', ro: 'O lecție' },
      estimated_minutes: 5,
      blocks: [{ type: 'text', body: { en: 'Hello' } }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a slug that is not kebab-case', () => {
    const result = lessonFile.safeParse({
      id: id('72'),
      slug: 'A Lesson',
      title: { en: 'A lesson' },
      estimated_minutes: 5,
      blocks: [{ type: 'text', body: { en: 'Hello' } }],
    });
    expect(result.success).toBe(false);
  });
});

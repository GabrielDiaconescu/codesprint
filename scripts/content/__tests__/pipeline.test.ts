import { buildFromDisk } from '../build';
import { allQuestions, loadContent } from '../load';
import { collectRunnables } from '../runnables';
import { lessonPayloadBytes, runValidation, summarise } from '../validate';

/**
 * Runs the pipeline against the REAL content on every `npm test`.
 *
 * `npm run content:validate` does the same thing, but only when someone remembers to run it.
 * Putting it here means a content mistake fails the ordinary test suite and CI, next to the
 * code that would have served it.
 *
 * The Python execution checks are not here: they need real interpreters, so they stay in
 * `verify_python.py` and run as their own CI step.
 */

describe('the published content', () => {
  it('passes every validation rule', () => {
    const problems = runValidation();

    // Printed in full on failure: "3 problems" without saying which is useless in CI.
    expect(problems.map((p) => `${p.file} ${p.path ?? ''} ${p.message}`)).toEqual([]);
  });

  it('meets the development seed requirements (SPEC §35)', () => {
    const stats = summarise(loadContent().courses);

    expect(stats.modules).toBeGreaterThanOrEqual(2);
    expect(stats.types).toBe(8);
    expect(stats.examPool).toBeGreaterThanOrEqual(30);
    expect(stats.challengePool).toBeGreaterThanOrEqual(14);
  });

  it('has been reviewed in full', () => {
    const stats = summarise(loadContent().courses);
    expect(stats.reviewed).toBe(stats.questions);
  });

  it('keeps every lesson inside the 50 KB payload budget (SPEC §45)', () => {
    // A lesson arrives in one RPC response, often on a phone on mobile data. `validate`
    // enforces the ceiling; this names the worst offender, so Phase 19 sees the headroom
    // shrinking rather than discovering it gone.
    const largest = loadContent()
      .courses.flatMap((course) => course.modules)
      .flatMap((module) => module.lessons)
      .map((lesson) => ({ file: lesson.file, kb: lessonPayloadBytes(lesson.data) / 1024 }))
      .sort((a, b) => b.kb - a.kb)[0];

    expect(largest).toBeDefined();
    expect({ file: largest?.file, under50KB: (largest?.kb ?? 0) < 50 }).toEqual({
      file: largest?.file,
      under50KB: true,
    });
  });
});

describe('the rows that would be written', () => {
  const rows = buildFromDisk();

  it('gives every question exactly one answer key', () => {
    expect(rows.answerKeys).toHaveLength(rows.questions.length);

    const questionIds = new Set(rows.questions.map((q) => q.id));
    const orphans = rows.answerKeys.filter((k) => !questionIds.has(k.question_id));
    expect(orphans).toEqual([]);
  });

  /**
   * The security property the whole content model rests on (SPEC §17, §40). `payload` is
   * served to the client; if an answer ever reaches it, every question becomes free.
   */
  it('never puts an answer in a payload', () => {
    const leaks = rows.questions
      .filter((q) =>
        /"(answer|correct|correct_answer|is_correct|solution)"/i.test(JSON.stringify(q.payload)),
      )
      .map((q) => q.id);

    expect(leaks).toEqual([]);
  });

  it('never puts an answer in a stored lesson block', () => {
    // Blocks reference questions by id rather than embedding them, so an answer cannot ride
    // along inside the lesson body either.
    const leaks = rows.lessonContents
      .filter((c) => /"(answer|correct|solution)"/i.test(JSON.stringify(c.blocks)))
      .map((c) => c.lesson_id);

    expect(leaks).toEqual([]);
  });

  it('references only questions that exist, from every lesson block', () => {
    const questionIds = new Set(rows.questions.map((q) => q.id));

    const dangling = rows.lessonContents.flatMap((content) =>
      (content.blocks as { type: string; question_id?: string }[])
        .filter((block) => block.type === 'question')
        .map((block) => block.question_id!)
        .filter((questionId) => !questionIds.has(questionId)),
    );

    expect(dangling).toEqual([]);
  });

  it('numbers questions within a lesson from one, without gaps', () => {
    const byLesson = new Map<string, number[]>();
    for (const question of rows.questions) {
      byLesson.set(question.lesson_id, [
        ...(byLesson.get(question.lesson_id) ?? []),
        question.order_index,
      ]);
    }

    for (const [lessonId, orders] of byLesson) {
      const sorted = [...orders].sort((a, b) => a - b);
      const expected = sorted.map((_, index) => index + 1);
      expect({ lessonId, orders: sorted }).toEqual({ lessonId, orders: expected });
    }
  });

  it('gives every row a content hash, so republishing can skip what has not changed', () => {
    expect(rows.lessons.every((l) => l.content_hash.length > 0)).toBe(true);
    expect(rows.questions.every((q) => q.content_hash.length > 0)).toBe(true);
  });
});

describe('the Python verification manifest', () => {
  const cases = collectRunnables();

  it('has something to verify', () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  it('covers every runnable code block and predict_output question', () => {
    const questions = allQuestions(loadContent().courses);
    const expectedPredictions = questions.filter(
      (q) => q.question.type === 'predict_output' && q.question.runnable,
    ).length;

    const predictionCases = cases.filter((c) =>
      questions.some((q) => q.question.id === c.id && q.question.type === 'predict_output'),
    );

    expect(predictionCases).toHaveLength(expectedPredictions);
  });

  it('checks both sides of every runnable debugging question', () => {
    // One case proving the broken version is broken, one proving the fix works. Only the
    // pair together shows the question is worth asking.
    const broken = cases.filter((c) => c.kind === 'expect_broken');
    const fixed = cases.filter((c) => c.id.endsWith('#fixed'));

    expect(broken.length).toBeGreaterThan(0);
    expect(fixed).toHaveLength(broken.length);
  });

  it('gives every case a location a human can open', () => {
    expect(cases.every((c) => c.where.includes('.yaml'))).toBe(true);
  });
});

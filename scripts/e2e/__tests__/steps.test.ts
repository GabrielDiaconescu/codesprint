import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { parseAllDocuments } from 'yaml';

import type { ContentQuestion, LessonFile } from '../../../src/lib/content/schema';
import { loadCourses, generatedFiles } from '../generate';
import {
  FREE_ACCOUNT_FINISHED_LESSONS,
  fixtureSql,
  moduleOneLessons,
  pinnedChallenge,
} from '../fixtures';
import { answerInput, attemptFirstQuestion, playLesson, type Command } from '../steps';

/**
 * The E2E generator (SPEC §53).
 *
 * A wrong mapping here fails on a device, minutes into a run, as "element not found". These
 * catch it in the ordinary test run instead: each question type taps the controls its renderer
 * really draws, and "wrong" is genuinely wrong.
 */

const courses = loadCourses();
const lessons = moduleOneLessons(courses);
const questions = lessons.flatMap((lesson) =>
  lesson.blocks.flatMap((block) => (block.type === 'question' ? [block.question] : [])),
);

/** The ids a command list taps, in order. */
const taps = (commands: Command[]): string[] =>
  commands.flatMap((command) =>
    typeof command === 'object' && 'tapOn' in command ? [command.tapOn.id] : [],
  );

const typed = (commands: Command[]): string[] =>
  commands.flatMap((command) =>
    typeof command === 'object' && 'inputText' in command ? [command.inputText] : [],
  );

const ofType = <T extends ContentQuestion['type']>(type: T) => {
  const found = questions.find((q) => q.type === type);
  if (!found) throw new Error(`module 1 has no ${type}`);
  return found as Extract<ContentQuestion, { type: T }>;
};

describe('module 1 as the E2E course', () => {
  it('holds every V1 question type, so playing it exercises every renderer', () => {
    expect(new Set(questions.map((q) => q.type))).toEqual(
      new Set([
        'multiple_choice',
        'multiple_select',
        'true_false',
        'predict_output',
        'fill_blank',
        'code_ordering',
        'debugging',
        'concept_matching',
      ]),
    );
  });

  it('has more lessons than the fixture finishes, so the lives flow has one left to play', () => {
    expect(lessons.length).toBeGreaterThan(FREE_ACCOUNT_FINISHED_LESSONS);
  });
});

describe('answer input', () => {
  it('true/false: the stated value, or its opposite', () => {
    const q = ofType('true_false');
    expect(taps(answerInput(q, 'correct'))).toEqual([`tf-${q.answer.value}`]);
    expect(taps(answerInput(q, 'wrong'))).toEqual([`tf-${!q.answer.value}`]);
  });

  it('multiple choice: the right option, or another real one', () => {
    const q = ofType('multiple_choice');
    const ids = q.payload.options.map((o) => `choice-${o.id}`);

    expect(taps(answerInput(q, 'correct'))).toEqual([`choice-${q.answer.option_id}`]);
    const [wrong] = taps(answerInput(q, 'wrong'));
    expect(ids).toContain(wrong);
    expect(wrong).not.toBe(`choice-${q.answer.option_id}`);
  });

  it('multiple select: every right option, or only some — which all-or-nothing grades wrong', () => {
    const q = ofType('multiple_select');
    const right = taps(answerInput(q, 'correct'));
    const wrong = taps(answerInput(q, 'wrong'));

    expect(right).toEqual(q.answer.option_ids.map((id) => `choice-${id}`));
    expect(wrong.length).toBeGreaterThan(0);
    expect(wrong.length).toBeLessThan(right.length);
  });

  it('predict output: types the expected output, or picks the option that shows it', () => {
    for (const q of questions) {
      if (q.type !== 'predict_output') continue;

      if (q.payload.input === 'text') {
        expect(typed(answerInput(q, 'correct'))).toEqual([q.answer.value]);
        expect(typed(answerInput(q, 'wrong'))).not.toEqual([q.answer.value]);
      } else {
        const [tapped] = taps(answerInput(q, 'correct'));
        const option = q.payload.options?.find((o) => `choice-${o.id}` === tapped);
        expect(option?.text.en).toBe(q.answer.value);
      }
    }
  });

  it('fill in the blank: the right token, or another one from the bank', () => {
    const q = ofType('fill_blank');
    expect(taps(answerInput(q, 'correct'))).toEqual([`token-${q.answer.value}`]);
    expect(taps(answerInput(q, 'wrong'))).not.toEqual([`token-${q.answer.value}`]);
  });

  it('code ordering: every line in the answer order, or reversed', () => {
    const q = ofType('code_ordering');
    const right = taps(answerInput(q, 'correct'));

    expect(right).toEqual(q.answer.order.map((id) => `bank-${id}`));
    expect(taps(answerInput(q, 'wrong'))).toEqual([...right].reverse());
  });

  it('debugging: the faulty line, or a line that is fine', () => {
    const q = ofType('debugging');
    expect(taps(answerInput(q, 'correct'))).toContain(`line-${q.answer.line_id}`);
    expect(taps(answerInput(q, 'wrong'))).not.toContain(`line-${q.answer.line_id}`);
  });

  it('concept matching: every pair right, or no pair right at all', () => {
    const q = ofType('concept_matching');
    const pairsTapped = (commands: Command[]) => {
      const ids = taps(commands);
      const pairs: Record<string, string> = {};
      for (let i = 0; i < ids.length; i += 2) {
        pairs[ids[i]!.replace('concept-', '')] = ids[i + 1]!.replace('definition-', '');
      }
      return pairs;
    };

    expect(pairsTapped(answerInput(q, 'correct'))).toEqual(q.answer.pairs);
    for (const [concept, definition] of Object.entries(pairsTapped(answerInput(q, 'wrong')))) {
      expect(definition).not.toBe(q.answer.pairs[concept]);
    }
  });
});

describe('playing a lesson', () => {
  const lesson = {
    blocks: [
      { type: 'text', body: { en: 'a' } },
      { type: 'question', question: ofType('true_false') },
      { type: 'text', body: { en: 'b' } },
      { type: 'text', body: { en: 'c' } },
      { type: 'question', question: ofType('multiple_choice') },
    ],
  } as unknown as LessonFile;

  it('turns each run of reading blocks into one Continue, as the player pages them', () => {
    const tapped = taps(playLesson(lesson)).filter((id) => id === 'lesson-continue');
    expect(tapped).toHaveLength(2);
  });

  it('ends on the completion screen', () => {
    expect(playLesson(lesson).at(-1)).toEqual({
      extendedWaitUntil: { visible: { id: 'lesson-complete' }, timeout: 20_000 },
    });
  });

  it('can stop on the last feedback, for a flow that asserts what that answer did', () => {
    const commands = playLesson(lesson, { mode: 'wrong', stopAtLastFeedback: true });

    expect(commands.at(-1)).toMatchObject({
      scrollUntilVisible: { element: { id: 'answer-feedback' } },
    });
    expect(taps(commands).filter((id) => id === 'answer-feedback-continue')).toHaveLength(1);
  });
});

describe('attempting a lesson with no lives', () => {
  it('stops right after Check — the refusal, not feedback, is what comes next', () => {
    const lesson = lessons[0]!;
    const commands = attemptFirstQuestion(lesson);

    expect(commands.at(-1)).toEqual({ tapOn: { id: 'check-answer' } });
    expect(taps(commands)).not.toContain('answer-feedback-continue');
  });
});

describe('fixtures', () => {
  it('pins three free, challenge-eligible questions from module 1', () => {
    const pinned = pinnedChallenge(courses);
    expect(pinned).toHaveLength(3);
    expect(pinned.every((q) => questions.includes(q))).toBe(true);
    expect(pinned.every((q) => q.is_challenge_eligible !== false)).toBe(true);
  });

  it('finishes the free account lessons through the real functions, not by inserting rows', () => {
    const sql = fixtureSql(courses);
    expect(sql.match(/public\.complete_lesson\(/g)).toHaveLength(FREE_ACCOUNT_FINISHED_LESSONS);
    expect(sql).toContain('public.submit_answer(');
    expect(sql).not.toMatch(/insert into public\.(user_lesson_progress|xp_events|user_stats)/);
  });
});

/**
 * Every `runFlow` in the hand-written flows points at something that will exist: a subflow in
 * the repository, or a file the generator writes. A renamed subflow otherwise fails only on a
 * device, as "file not found", after the minutes it took to get there.
 */
describe('flow references', () => {
  const E2E = join(process.cwd(), 'e2e');
  const generated = new Set(Object.keys(generatedFiles(courses)));

  const referencesIn = (file: string): string[] => {
    const parsed = parseAllDocuments(readFileSync(file, 'utf8'));
    // The parser records errors instead of throwing, so a broken flow would otherwise pass here
    // and fail only on the device — as a `:` inside an unquoted expression once did.
    const errors = parsed.flatMap((doc) => doc.errors.map((error) => error.message));
    expect({ file, errors }).toEqual({ file, errors: [] });
    const docs = parsed.map((doc) => doc.toJS() as unknown);
    const found: string[] = [];
    const walk = (node: unknown) => {
      if (Array.isArray(node)) node.forEach(walk);
      else if (node && typeof node === 'object') {
        for (const [key, value] of Object.entries(node)) {
          if (key === 'runFlow') {
            const path = typeof value === 'string' ? value : (value as { file?: string }).file;
            if (path) found.push(path);
          }
          if (key === 'runScript') {
            const path = typeof value === 'string' ? value : (value as { file?: string }).file;
            if (path) found.push(path);
          }
          walk(value);
        }
      }
    };
    docs.forEach(walk);
    return found;
  };

  const files = ['flows', 'subflows'].flatMap((dir) =>
    readdirSync(join(E2E, dir))
      .filter((name) => name.endsWith('.yaml'))
      .map((name) => join(E2E, dir, name)),
  );

  it.each(files.map((file) => [file.slice(E2E.length + 1), file]))('%s', (_, file) => {
    for (const reference of referencesIn(file)) {
      const target = resolve(dirname(file), reference);
      const inGenerated = dirname(target) === join(E2E, 'generated');
      const exists = inGenerated
        ? generated.has(target.slice(dirname(target).length + 1))
        : existsSync(target);

      expect({ reference, exists }).toEqual({ reference, exists: true });
    }
  });
});

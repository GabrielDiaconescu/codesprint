import { QUESTION_TYPES, type LocalizedText } from '../../src/lib/content/schema';

import { allQuestions, loadContent, type Issue, type LoadedCourse } from './load';

/**
 * Content validation (SPEC §35.1).
 *
 * Runs on every change, locally and in CI. The Zod schemas in `src/lib/content/schema.ts`
 * check each file on its own; everything here is a rule that spans files — duplicate ids,
 * dangling references, and the shape of the seed as a whole.
 *
 * It reports EVERY problem rather than stopping at the first, because an author fixing ten
 * files should not need ten runs.
 */

/** SPEC §35: a lesson is 4–8 questions. Fewer is thin; more stops being five minutes. */
const MIN_QUESTIONS_PER_LESSON = 4;
const MAX_QUESTIONS_PER_LESSON = 8;

/** SPEC §35, development seed. Launch volume (§19) is checked separately in Phase 19. */
const SEED_MIN_MODULES = 2;
const SEED_MIN_EXAM_POOL = 30;
const SEED_MIN_CHALLENGE_POOL = 14;

/**
 * Text that means the author was not finished. Checked against every localised string,
 * because "no Lorem ipsum, no 'Question 1', no disguised test data" (SPEC §52) is the
 * difference between a seed and a demo.
 */
const PLACEHOLDER_PATTERNS = [
  /lorem ipsum/i,
  /\bTODO\b/,
  /\bTBD\b/,
  /\bFIXME\b/,
  /\bplaceholder\b/i,
  /^question \d+$/i,
  /^option [a-d]$/i,
  /\bxxx+\b/i,
];

const localizedStrings = (text: LocalizedText | undefined): string[] =>
  text ? Object.values(text) : [];

export const runValidation = (root?: string): Issue[] => {
  const { courses, issues } = loadContent(root);
  const problems = [...issues];

  const add = (file: string, message: string, path?: string) =>
    problems.push({ file, path, message });

  /* ---------------------------------------------------------------- unique, stable ids */

  const seenIds = new Map<string, string>();
  const claimId = (id: string, file: string, what: string) => {
    const existing = seenIds.get(id);
    if (existing) {
      add(file, `${what} reuses id ${id}, already used by ${existing}`, 'id');
    } else {
      seenIds.set(id, `${file} (${what})`);
    }
  };

  for (const course of courses) {
    claimId(course.data.id, course.file, 'course');
    for (const exam of course.data.exams) claimId(exam.id, course.file, `exam "${exam.slug}"`);

    for (const module of course.modules) {
      claimId(module.data.id, module.file, 'module');
      for (const lesson of module.lessons) claimId(lesson.data.id, lesson.file, 'lesson');
    }
  }

  const questions = allQuestions(courses);
  for (const entry of questions) {
    claimId(entry.question.id, entry.file, `question "${entry.question.type}"`);
  }

  /* ---------------------------------------------------------------- per-course structure */

  for (const course of courses) {
    const orders = course.modules.map((m) => m.data.order_index);
    const duplicateOrders = orders.filter((o, i) => orders.indexOf(o) !== i);
    if (duplicateOrders.length > 0) {
      add(course.file, `two modules share order_index ${[...new Set(duplicateOrders)].join(', ')}`);
    }

    // Gaps are not fatal, but they are almost always a module that was deleted or never
    // committed, and the free/premium boundary counts modules by position (SPEC D5).
    orders
      .sort((a, b) => a - b)
      .forEach((order, index) => {
        if (order !== index + 1) {
          add(course.file, `module order_index jumps to ${order} where ${index + 1} was expected`);
        }
      });

    for (const exam of course.data.exams) {
      const pool = questions.filter(
        (q) => q.courseSlug === course.data.slug && q.question.is_exam_eligible,
      ).length;
      if (exam.question_count > pool) {
        add(
          course.file,
          `exam "${exam.slug}" draws ${exam.question_count} questions from a pool of ${pool}`,
          'exams',
        );
      }
    }
  }

  /* ---------------------------------------------------------------- per-lesson rules */

  for (const course of courses) {
    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        const count = lesson.data.blocks.filter((b) => b.type === 'question').length;

        if (count < MIN_QUESTIONS_PER_LESSON || count > MAX_QUESTIONS_PER_LESSON) {
          add(
            lesson.file,
            `has ${count} questions; SPEC §35 requires ${MIN_QUESTIONS_PER_LESSON}–${MAX_QUESTIONS_PER_LESSON}`,
            'blocks',
          );
        }

        // A lesson that opens with a question teaches nothing first (SPEC §15).
        const firstBlock = lesson.data.blocks[0];
        if (firstBlock?.type === 'question') {
          add(lesson.file, 'starts with a question before explaining anything', 'blocks.0');
        }
      }

      /* ------------------------------------------------------------ difficulty mix */

      const moduleQuestions = questions.filter((q) => q.moduleSlug === module.data.slug);
      if (moduleQuestions.length > 0) {
        const byDifficulty = {
          easy: moduleQuestions.filter((q) => q.question.difficulty === 'easy').length,
          medium: moduleQuestions.filter((q) => q.question.difficulty === 'medium').length,
          hard: moduleQuestions.filter((q) => q.question.difficulty === 'hard').length,
        };

        if (byDifficulty.easy === 0) {
          add(module.file, 'has no easy questions, so there is no gentle way in');
        }
        if (byDifficulty.medium === 0) {
          add(module.file, 'has no medium questions, so it never builds past recall');
        }

        const dominant = Math.max(...Object.values(byDifficulty));
        if (dominant / moduleQuestions.length > 0.75) {
          add(
            module.file,
            `is ${Math.round((dominant / moduleQuestions.length) * 100)}% one difficulty; vary the mix`,
          );
        }
      }
    }
  }

  /* ---------------------------------------------------------------- placeholder text */

  const checkText = (file: string, path: string, text: LocalizedText | undefined) => {
    for (const value of localizedStrings(text)) {
      for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.test(value)) {
          add(file, `looks like unfinished placeholder text: "${value.slice(0, 60)}"`, path);
        }
      }
    }
  };

  for (const course of courses) {
    checkText(course.file, 'title', course.data.title);
    checkText(course.file, 'description', course.data.description);

    for (const module of course.modules) {
      checkText(module.file, 'title', module.data.title);
      checkText(module.file, 'description', module.data.description);

      for (const lesson of module.lessons) {
        checkText(lesson.file, 'title', lesson.data.title);
        lesson.data.blocks.forEach((block, index) => {
          if (block.type === 'text' || block.type === 'callout') {
            checkText(lesson.file, `blocks.${index}.body`, block.body);
          }
        });
      }
    }
  }

  for (const entry of questions) {
    const where = `question ${entry.question.id}`;
    checkText(entry.file, `${where}.prompt`, entry.question.prompt);
    checkText(entry.file, `${where}.explanation`, entry.question.explanation);
    checkText(entry.file, `${where}.hint`, entry.question.hint);

    // The explanation is the teaching moment after an answer (SPEC §18). One clause is not
    // an explanation, and the schema's min(1) cannot tell the difference.
    if (entry.question.explanation.en.trim().length < 25) {
      add(entry.file, `${where} has an explanation too short to teach anything`, 'explanation');
    }
  }

  /* ---------------------------------------------------------------- the seed as a whole */

  const totalModules = courses.reduce((sum, c) => sum + c.modules.length, 0);
  if (totalModules < SEED_MIN_MODULES) {
    add('content/', `has ${totalModules} modules; the development seed needs ${SEED_MIN_MODULES}`);
  }

  const presentTypes = new Set(questions.map((q) => q.question.type));
  for (const type of QUESTION_TYPES) {
    if (!presentTypes.has(type)) {
      add('content/', `no question of type "${type}" exists, so its renderer is never exercised`);
    }
  }

  const examPool = questions.filter((q) => q.question.is_exam_eligible).length;
  if (examPool < SEED_MIN_EXAM_POOL) {
    add('content/', `exam pool is ${examPool}; the development seed needs ${SEED_MIN_EXAM_POOL}`);
  }

  const challengePool = questions.filter((q) => q.question.is_challenge_eligible).length;
  if (challengePool < SEED_MIN_CHALLENGE_POOL) {
    add(
      'content/',
      `challenge pool is ${challengePool}; the development seed needs ${SEED_MIN_CHALLENGE_POOL}`,
    );
  }

  return problems;
};

/** Counts worth printing on success, so a green run still says what it checked. */
export const summarise = (courses: LoadedCourse[]) => {
  const questions = allQuestions(courses);
  return {
    courses: courses.length,
    modules: courses.reduce((sum, c) => sum + c.modules.length, 0),
    lessons: courses.reduce((sum, c) => sum + c.modules.reduce((n, m) => n + m.lessons.length, 0), 0),
    questions: questions.length,
    types: new Set(questions.map((q) => q.question.type)).size,
    examPool: questions.filter((q) => q.question.is_exam_eligible).length,
    challengePool: questions.filter((q) => q.question.is_challenge_eligible).length,
    reviewed: questions.filter((q) => q.question.review_status === 'reviewed').length,
  };
};

const main = () => {
  const problems = runValidation();

  if (problems.length > 0) {
    const byFile = new Map<string, Issue[]>();
    for (const problem of problems) {
      byFile.set(problem.file, [...(byFile.get(problem.file) ?? []), problem]);
    }

    for (const [file, fileIssues] of [...byFile].sort()) {
      console.error(`\n${file}`);
      for (const issue of fileIssues) {
        console.error(`  ${issue.path ? `${issue.path}: ` : ''}${issue.message}`);
      }
    }

    console.error(`\n${problems.length} problem(s) found.`);
    process.exit(1);
  }

  const { courses } = loadContent();
  const stats = summarise(courses);
  console.log('Content is valid.');
  console.log(
    `  ${stats.courses} course, ${stats.modules} modules, ${stats.lessons} lessons, ` +
      `${stats.questions} questions (${stats.types}/${QUESTION_TYPES.length} types)`,
  );
  console.log(
    `  exam pool ${stats.examPool}, challenge pool ${stats.challengePool}, ` +
      `${stats.reviewed} reviewed`,
  );
};

// Only run when invoked as a script, so the test suite can import the rules.
if (process.argv[1]?.includes('validate')) main();

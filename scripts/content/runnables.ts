import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { allQuestions, loadContent } from './load';

/**
 * Extracts everything the content claims Python will do (SPEC §35.2).
 *
 * `verify_python.py` consumes this manifest. Emitting JSON from here rather than parsing YAML
 * in Python keeps the schemas in exactly one place and means the verifier needs no third-party
 * Python packages at all — the standard library is enough, on any machine and in CI.
 */

export type RunnableCase =
  /** Run it; stdout must equal `expected`. */
  | { kind: 'expect_output'; id: string; where: string; code: string; expected: string }
  /**
   * Run it; it must FAIL or produce something other than `not_expected`.
   *
   * This proves the premise of a debugging question. A "find the bug" exercise whose broken
   * code works perfectly is worse than no exercise — it teaches the learner to distrust
   * their own correct reading.
   */
  | { kind: 'expect_broken'; id: string; where: string; code: string; notExpected: string };

const norm = (text: string) => text.replace(/\r\n/g, '\n').replace(/\s+$/, '');

export const collectRunnables = (root?: string): RunnableCase[] => {
  const { courses } = loadContent(root);
  const cases: RunnableCase[] = [];

  for (const course of courses) {
    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        lesson.data.blocks.forEach((block, index) => {
          if (block.type === 'code' && block.runnable && block.output !== undefined) {
            cases.push({
              kind: 'expect_output',
              id: `${lesson.data.slug}#block-${index}`,
              where: `${lesson.file} blocks.${index}`,
              code: block.code,
              expected: norm(block.output),
            });
          }
        });
      }
    }
  }

  for (const entry of allQuestions(courses)) {
    const q = entry.question;
    const where = `${entry.file} question ${q.id}`;

    if (q.type === 'predict_output' && q.runnable) {
      cases.push({
        kind: 'expect_output',
        id: q.id,
        where,
        code: q.code_snippet,
        expected: norm(q.answer.value),
      });
    }

    if (q.type === 'code_ordering' && q.runnable && q.expected_output !== undefined) {
      // The answer order IS the program. Running it proves the stated order is the one that
      // works, rather than one of several that merely look plausible.
      const byId = new Map(q.payload.lines.map((line) => [line.id, line.text]));
      cases.push({
        kind: 'expect_output',
        id: q.id,
        where,
        code: q.answer.order.map((id) => byId.get(id) ?? '').join('\n') + '\n',
        expected: norm(q.expected_output),
      });
    }

    if (q.type === 'debugging' && q.runnable && q.fixed_code && q.fixed_output !== undefined) {
      cases.push({
        kind: 'expect_broken',
        id: `${q.id}#broken`,
        where: `${where} (the code as shown)`,
        code: q.code_snippet,
        notExpected: norm(q.fixed_output),
      });
      cases.push({
        kind: 'expect_output',
        id: `${q.id}#fixed`,
        where: `${where} (fixed_code)`,
        code: q.fixed_code,
        expected: norm(q.fixed_output),
      });
    }
  }

  return cases;
};

const main = () => {
  const outIndex = process.argv.indexOf('--out');
  const cases = collectRunnables();
  const json = JSON.stringify(cases, null, 2);

  if (outIndex !== -1 && process.argv[outIndex + 1]) {
    const target = process.argv[outIndex + 1]!;
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, json, 'utf8');
    console.log(`Wrote ${cases.length} runnable case(s) to ${target}`);
  } else {
    process.stdout.write(json);
  }
};

if (process.argv[1]?.includes('runnables')) main();

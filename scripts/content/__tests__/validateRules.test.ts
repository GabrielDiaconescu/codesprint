import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { runValidation } from '../validate';

/**
 * The validator's rules, each proven against a real fault.
 *
 * A rule that only ever runs against clean content has never been seen to fire — it could be
 * checking nothing at all. So each test copies the real content, breaks one file in exactly the
 * way the rule exists to catch, and asserts that the rule names it.
 *
 * Copying the real content (rather than hand-writing a tiny fixture) keeps everything else
 * valid, so the only problem reported is the one that was planted.
 */

const CONTENT = join(__dirname, '..', '..', '..', 'content');
const LESSON = join(
  'python-fundamentals',
  'modules',
  '01-getting-started',
  'lessons',
  '01-what-is-python.yaml',
);

const copies: string[] = [];

/** A fresh copy of the content, with one file rewritten by `edit`. */
const brokenCopy = (edit: (source: string) => string): string => {
  const root = mkdtempSync(join(tmpdir(), 'codesprint-content-'));
  copies.push(root);
  cpSync(CONTENT, root, { recursive: true });

  const file = join(root, LESSON);
  const before = readFileSync(file, 'utf8');
  const after = edit(before);
  // A no-op edit would make every test below pass for the wrong reason.
  expect(after).not.toBe(before);
  writeFileSync(file, after);
  return root;
};

const messages = (root: string) => runValidation(root).map((p) => `${p.path ?? ''} ${p.message}`);

afterAll(() => {
  for (const root of copies) rmSync(root, { recursive: true, force: true });
});

describe('validation rules', () => {
  it('finds nothing wrong with an untouched copy', () => {
    // The baseline: whatever the tests below report was planted, not inherited.
    const root = mkdtempSync(join(tmpdir(), 'codesprint-content-'));
    copies.push(root);
    cpSync(CONTENT, root, { recursive: true });

    expect(messages(root)).toEqual([]);
  });

  it('refuses a Markdown list, which the lesson renderer would run into one line', () => {
    const root = brokenCopy((source) =>
      source.replace(
        '      en: |\n',
        '      en: |\n        - first point\n        - second point\n',
      ),
    );

    expect(messages(root).join('\n')).toMatch(/uses a Markdown list/);
  });

  it('refuses a Markdown heading', () => {
    const root = brokenCopy((source) =>
      source.replace('      en: |\n', '      en: |\n        ## A heading\n'),
    );

    expect(messages(root).join('\n')).toMatch(/uses a Markdown heading/);
  });

  it('refuses an output that is shown to learners but never run', () => {
    // Four spaces of indentation is a code block's own field, not a question's.
    const root = brokenCopy((source) =>
      source.replace('    runnable: true\n', '    runnable: false\n'),
    );

    expect(messages(root).join('\n')).toMatch(/states an output but is not runnable/);
  });

  it('refuses a multiple_choice answer that is not one of its options', () => {
    const root = brokenCopy((source) =>
      source.replace(/(\n\s+option_id: )[a-z-]+/, '$1not-an-option'),
    );

    expect(messages(root).join('\n')).toMatch(/"not-an-option" is not one of the options/);
  });
});

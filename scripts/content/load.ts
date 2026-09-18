import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

import { parse as parseYaml } from 'yaml';
import type { ZodType } from 'zod';

import {
  courseFile,
  lessonFile,
  moduleFile,
  type CourseFile,
  type LessonFile,
  type ModuleFile,
} from '../../src/lib/content/schema';

/**
 * Reads the content tree off disk (SPEC §35).
 *
 * Parsing is separated from validating so that `validate.ts` can report EVERY problem in one
 * run. An author fixing ten files does not want ten runs, and a loader that threw on the
 * first bad file would give them exactly that.
 */

export const CONTENT_ROOT = join(process.cwd(), 'content');

export interface Issue {
  /** Path relative to the repository root, so the message is clickable in an editor. */
  file: string;
  path?: string;
  message: string;
}

export interface LoadedLesson {
  file: string;
  data: LessonFile;
}

export interface LoadedModule {
  file: string;
  dir: string;
  data: ModuleFile;
  lessons: LoadedLesson[];
}

export interface LoadedCourse {
  file: string;
  dir: string;
  data: CourseFile;
  modules: LoadedModule[];
}

export interface LoadResult {
  courses: LoadedCourse[];
  issues: Issue[];
}

const rel = (absolute: string) => relative(process.cwd(), absolute).replace(/\\/g, '/');

/** Parses one YAML file against a schema, collecting issues rather than throwing. */
const readFile = <T>(absolute: string, schema: ZodType<T>, issues: Issue[]): T | null => {
  const file = rel(absolute);

  let raw: unknown;
  try {
    raw = parseYaml(readFileSync(absolute, 'utf8'));
  } catch (error) {
    issues.push({ file, message: `could not be parsed as YAML: ${(error as Error).message}` });
    return null;
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    for (const issue of result.error.issues) {
      issues.push({ file, path: issue.path.join('.'), message: issue.message });
    }
    return null;
  }

  return result.data;
};

const directoriesIn = (parent: string): string[] =>
  existsSync(parent)
    ? readdirSync(parent, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
    : [];

const loadModule = (dir: string, issues: Issue[]): LoadedModule | null => {
  const modulePath = join(dir, 'module.yaml');
  if (!existsSync(modulePath)) {
    issues.push({ file: rel(dir), message: 'has no module.yaml' });
    return null;
  }

  const data = readFile(modulePath, moduleFile, issues);
  if (!data) return null;

  // The directory is named NN-slug so the filesystem sorts the way the course reads. The
  // number must agree with order_index, or the two orderings silently disagree.
  const dirName = dir.split(/[\\/]/).pop() ?? '';
  const match = /^(\d{2})-(.+)$/.exec(dirName);
  if (!match) {
    issues.push({ file: rel(dir), message: `directory must be named NN-slug, got "${dirName}"` });
  } else {
    if (Number.parseInt(match[1]!, 10) !== data.order_index) {
      issues.push({
        file: rel(modulePath),
        path: 'order_index',
        message: `is ${data.order_index} but the directory says ${match[1]}`,
      });
    }
    if (match[2] !== data.slug) {
      issues.push({
        file: rel(modulePath),
        path: 'slug',
        message: `is "${data.slug}" but the directory says "${match[2]}"`,
      });
    }
  }

  const lessons: LoadedLesson[] = [];
  const lessonsDir = join(dir, 'lessons');

  data.lessons.forEach((lessonSlug, index) => {
    const number = String(index + 1).padStart(2, '0');
    const lessonPath = join(lessonsDir, `${number}-${lessonSlug}.yaml`);

    if (!existsSync(lessonPath)) {
      issues.push({
        file: rel(modulePath),
        path: `lessons.${index}`,
        message: `lists "${lessonSlug}" but ${rel(lessonPath)} does not exist`,
      });
      return;
    }

    const lesson = readFile(lessonPath, lessonFile, issues);
    if (!lesson) return;

    if (lesson.slug !== lessonSlug) {
      issues.push({
        file: rel(lessonPath),
        path: 'slug',
        message: `is "${lesson.slug}" but the module lists it as "${lessonSlug}"`,
      });
    }

    lessons.push({ file: rel(lessonPath), data: lesson });
  });

  // A lesson file nobody lists is invisible to the pipeline — almost always a forgotten
  // entry in module.yaml rather than a deliberate draft.
  if (existsSync(lessonsDir)) {
    const listed = new Set(
      data.lessons.map((s, i) => `${String(i + 1).padStart(2, '0')}-${s}.yaml`),
    );
    for (const name of readdirSync(lessonsDir)) {
      if (name.endsWith('.yaml') && !listed.has(name)) {
        issues.push({
          file: rel(join(lessonsDir, name)),
          message: 'exists but is not listed in module.yaml, so it would never be published',
        });
      }
    }
  }

  return { file: rel(modulePath), dir, data, lessons };
};

export const loadContent = (root: string = CONTENT_ROOT): LoadResult => {
  const issues: Issue[] = [];
  const courses: LoadedCourse[] = [];

  if (!existsSync(root)) {
    return { courses, issues: [{ file: rel(root), message: 'content directory does not exist' }] };
  }

  for (const courseDir of directoriesIn(root)) {
    const dir = join(root, courseDir);
    const coursePath = join(dir, 'course.yaml');

    if (!existsSync(coursePath)) {
      issues.push({ file: rel(dir), message: 'has no course.yaml' });
      continue;
    }

    const data = readFile(coursePath, courseFile, issues);
    if (!data) continue;

    if (data.slug !== courseDir) {
      issues.push({
        file: rel(coursePath),
        path: 'slug',
        message: `is "${data.slug}" but the directory is "${courseDir}"`,
      });
    }

    const modules = directoriesIn(join(dir, 'modules'))
      .map((name) => loadModule(join(dir, 'modules', name), issues))
      .filter((m): m is LoadedModule => m !== null)
      .sort((a, b) => a.data.order_index - b.data.order_index);

    courses.push({ file: rel(coursePath), dir, data, modules });
  }

  return { courses, issues };
};

/** Every question in the tree, with enough context to report where it came from. */
export const allQuestions = (courses: LoadedCourse[]) =>
  courses.flatMap((course) =>
    course.modules.flatMap((module) =>
      module.lessons.flatMap((lesson) =>
        lesson.data.blocks
          .filter((block) => block.type === 'question')
          .map((block, index) => ({
            file: lesson.file,
            courseSlug: course.data.slug,
            moduleSlug: module.data.slug,
            lessonSlug: lesson.data.slug,
            lessonId: lesson.data.id,
            orderIndex: index,
            question: (block as Extract<typeof block, { type: 'question' }>).question,
          })),
      ),
    ),
  );

export type LoadedQuestion = ReturnType<typeof allQuestions>[number];

import { createHash } from 'node:crypto';

import type { ContentQuestion } from '../../src/lib/content/schema';

import { loadContent, type LoadedCourse } from './load';

/**
 * Turns the content tree into database rows (SPEC §35.4).
 *
 * Shared by `seed.ts`, which writes SQL for local development, and `publish.ts`, which upserts
 * into a hosted project. Both need exactly the same rows, so the mapping lives here once —
 * a seed that disagreed with a publish would be the worst kind of bug to chase.
 */

/** Row shapes mirror the tables in `20260917120100_content_tables.sql`. */
export interface ContentRows {
  courses: CourseRow[];
  modules: ModuleRow[];
  lessons: LessonRow[];
  lessonContents: LessonContentRow[];
  questions: QuestionRow[];
  answerKeys: AnswerKeyRow[];
  exams: ExamRow[];
}

export interface CourseRow {
  id: string;
  slug: string;
  title: unknown;
  description: unknown;
  language: string;
  icon_key: string | null;
  order_index: number;
}

export interface ModuleRow {
  id: string;
  course_id: string;
  slug: string;
  title: unknown;
  description: unknown;
  order_index: number;
  is_premium_override: boolean | null;
  estimated_minutes: number;
}

export interface LessonRow {
  id: string;
  module_id: string;
  slug: string;
  title: unknown;
  summary: unknown;
  order_index: number;
  estimated_minutes: number;
  review_status: string;
  content_hash: string;
}

export interface LessonContentRow {
  lesson_id: string;
  blocks: unknown;
  content_hash: string;
}

export interface QuestionRow {
  id: string;
  lesson_id: string;
  type: string;
  difficulty: string;
  prompt: unknown;
  code_snippet: string | null;
  payload: unknown;
  explanation: unknown;
  hint: unknown;
  xp_reward: number | null;
  is_premium: boolean;
  is_challenge_eligible: boolean;
  is_exam_eligible: boolean;
  skill_tags: string[];
  order_index: number;
  review_status: string;
  content_hash: string;
}

export interface AnswerKeyRow {
  question_id: string;
  answer: unknown;
  match_mode: string;
  accepted_answers: unknown;
}

export interface ExamRow {
  id: string;
  course_id: string;
  slug: string;
  title: unknown;
  description: unknown;
  question_count: number;
  time_limit_minutes: number | null;
  pass_threshold_pct: number;
  requires_entitlement: string | null;
}

const hash = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 32);

/**
 * Splits a question into what the client may see and what it must never see (SPEC §17, §40).
 *
 * This is the single most important function in the pipeline. `payload` is served to the app;
 * `answer` goes to `question_answer_keys`, which has no client policies at all. The database
 * carries a CHECK constraint that rejects an answer-shaped key in `payload`, so a mistake here
 * fails the insert rather than leaking.
 */
const splitAnswer = (question: ContentQuestion): AnswerKeyRow => {
  const base = { question_id: question.id };

  if (question.type === 'predict_output' || question.type === 'fill_blank') {
    return {
      ...base,
      answer: { value: question.answer.value },
      match_mode: question.answer.match_mode,
      accepted_answers: question.answer.accepted_answers,
    };
  }

  // Every other type is compared structurally, so normalisation does not apply.
  return { ...base, answer: question.answer, match_mode: 'exact', accepted_answers: [] };
};

/**
 * The renderable part of a question. `payload` as authored already excludes the answer; the
 * blanks marker and the code snippet travel separately in their own columns.
 */
const renderablePayload = (question: ContentQuestion): unknown => question.payload;

export const buildRows = (courses: LoadedCourse[]): ContentRows => {
  const rows: ContentRows = {
    courses: [],
    modules: [],
    lessons: [],
    lessonContents: [],
    questions: [],
    answerKeys: [],
    exams: [],
  };

  for (const course of courses) {
    rows.courses.push({
      id: course.data.id,
      slug: course.data.slug,
      title: course.data.title,
      description: course.data.description ?? {},
      language: course.data.language,
      icon_key: course.data.icon_key ?? null,
      order_index: course.data.order_index,
    });

    for (const exam of course.data.exams) {
      rows.exams.push({
        id: exam.id,
        course_id: course.data.id,
        slug: exam.slug,
        title: exam.title,
        description: exam.description ?? {},
        question_count: exam.question_count,
        time_limit_minutes: exam.time_limit_minutes ?? null,
        pass_threshold_pct: exam.pass_threshold_pct,
        requires_entitlement: exam.requires_entitlement ?? null,
      });
    }

    for (const module of course.modules) {
      rows.modules.push({
        id: module.data.id,
        course_id: course.data.id,
        slug: module.data.slug,
        title: module.data.title,
        description: module.data.description ?? {},
        order_index: module.data.order_index,
        is_premium_override: module.data.is_premium_override ?? null,
        estimated_minutes: module.data.estimated_minutes,
      });

      module.lessons.forEach((lesson, lessonIndex) => {
        const blocks = lesson.data.blocks;

        // Questions live in their own table, so the blocks stored for the lesson reference
        // them by id instead of repeating them. That also keeps the lesson payload small
        // (SPEC §45 caps it at 50 KB) and makes it impossible for an answer to ride along
        // inside a block.
        const storedBlocks = blocks.map((block) =>
          block.type === 'question' ? { type: 'question', question_id: block.question.id } : block,
        );

        rows.lessons.push({
          id: lesson.data.id,
          module_id: module.data.id,
          slug: lesson.data.slug,
          title: lesson.data.title,
          summary: lesson.data.summary ?? {},
          order_index: lessonIndex + 1,
          estimated_minutes: lesson.data.estimated_minutes,
          review_status: lesson.data.review_status,
          content_hash: hash(lesson.data),
        });

        rows.lessonContents.push({
          lesson_id: lesson.data.id,
          blocks: storedBlocks,
          content_hash: hash(storedBlocks),
        });

        let questionOrder = 0;
        for (const block of blocks) {
          if (block.type !== 'question') continue;
          const question = block.question;
          questionOrder += 1;

          rows.questions.push({
            id: question.id,
            lesson_id: lesson.data.id,
            type: question.type,
            difficulty: question.difficulty,
            prompt: question.prompt,
            code_snippet: question.code_snippet ?? null,
            payload: renderablePayload(question),
            explanation: question.explanation,
            hint: question.hint ?? null,
            xp_reward: question.xp_reward ?? null,
            is_premium: question.is_premium,
            is_challenge_eligible: question.is_challenge_eligible,
            is_exam_eligible: question.is_exam_eligible,
            skill_tags: question.skill_tags,
            order_index: questionOrder,
            review_status: question.review_status,
            content_hash: hash(question),
          });

          rows.answerKeys.push(splitAnswer(question));
        }
      });
    }
  }

  return rows;
};

export const buildFromDisk = (root?: string): ContentRows => buildRows(loadContent(root).courses);

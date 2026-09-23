import type { ContentQuestion, LessonFile } from '../../src/lib/content/schema';

/**
 * Turns content into Maestro commands (SPEC §53 — E2E).
 *
 * The flows play real lessons against the real grading RPCs, so they need the answers. Writing
 * them into the flows by hand would copy every answer key into a second place that silently
 * drifts from the content. Instead they are derived here from the same YAML the pipeline
 * publishes, and regenerated on every run.
 *
 * Everything here targets `testID`s, never visible text: the flows must pass in English and in
 * Romanian, and an id says which control is meant even when two show the same words.
 *
 * Pure, so each question type's mapping is unit-tested without a device.
 */

export type Command =
  | { tapOn: { id: string } }
  | {
      scrollUntilVisible: {
        element: { id: string };
        direction: 'DOWN';
        timeout: number;
        visibilityPercentage: number;
      };
    }
  | { inputText: string }
  | { pressKey: 'Enter' }
  | { extendedWaitUntil: { visible: { id: string }; timeout: number } }
  | { extendedWaitUntil: { notVisible: { id: string }; timeout: number } };

export type AnswerMode = 'correct' | 'wrong';

/** Long enough for a cold local RPC on an emulator, short enough to fail a stuck run. */
const WAIT_MS = 20_000;

/**
 * Scroll down until an element is at least partly on screen, waiting for it to appear if it
 * has not yet. Partly, because a panel taller than the screen — feedback with a long
 * explanation — can never be fully visible, and waiting for that would never end.
 */
export const scrollTo = (id: string, visibilityPercentage = 10): Command => ({
  scrollUntilVisible: {
    element: { id },
    direction: 'DOWN',
    timeout: WAIT_MS,
    visibilityPercentage,
  },
});

/**
 * Scroll to an element, then tap it. A code snippet can push the options below the fold, and
 * Maestro does not scroll on its own. Fully visible, so the tap lands on the control and not
 * on whatever overlaps its clipped edge.
 */
export const tap = (id: string): Command[] => [scrollTo(id, 100), { tapOn: { id } }];

/** Wait for an element that appears at the top of a screen, where no scrolling is needed. */
export const waitFor = (id: string, timeout = WAIT_MS): Command => ({
  extendedWaitUntil: { visible: { id }, timeout },
});

/**
 * Type into the answer box, then Enter — which closes the keyboard ("done") without submitting.
 * Never `hideKeyboard`: on Android it presses Back, and if the keyboard is not up at that
 * instant, Back leaves the lesson.
 */
const typeText = (text: string): Command[] => [
  ...tap('answer-text'),
  { inputText: text },
  { pressKey: 'Enter' },
];

/** The first entry that is not `avoid`: the wrong answer that is still a real option. */
const firstOther = <T>(values: readonly T[], avoid: T): T => {
  const other = values.find((value) => value !== avoid);
  if (other === undefined) throw new Error('no wrong option to choose');
  return other;
};

/** The option whose English text is exactly the expected output. */
const optionWithText = (
  options: readonly { id: string; text: Record<string, string> }[],
  text: string,
): string => {
  const match = options.find((option) => option.text.en === text);
  if (!match) throw new Error(`no option reads ${JSON.stringify(text)}`);
  return match.id;
};

/**
 * The taps that enter an answer — correct, or deliberately wrong — before Check is pressed.
 *
 * "Wrong" is always a plausible wrong: another real option, an incomplete selection, the lines
 * in the wrong order. Never an empty answer, which the Check button would refuse.
 */
export const answerInput = (question: ContentQuestion, mode: AnswerMode): Command[] => {
  const right = mode === 'correct';

  switch (question.type) {
    case 'true_false': {
      const value = right ? question.answer.value : !question.answer.value;
      return tap(`tf-${value ? 'true' : 'false'}`);
    }

    case 'multiple_choice': {
      const ids = question.payload.options.map((o) => o.id);
      return tap(
        `choice-${right ? question.answer.option_id : firstOther(ids, question.answer.option_id)}`,
      );
    }

    case 'multiple_select': {
      // All-or-nothing grading (SPEC §16), so one correct option on its own is wrong.
      const chosen = right ? question.answer.option_ids : question.answer.option_ids.slice(0, 1);
      return chosen.flatMap((id) => tap(`choice-${id}`));
    }

    case 'predict_output': {
      if (question.payload.input === 'choice') {
        const options = question.payload.options ?? [];
        const correctId = optionWithText(options, question.answer.value);
        const ids = options.map((o) => o.id);
        return tap(`choice-${right ? correctId : firstOther(ids, correctId)}`);
      }
      return typeText(right ? question.answer.value : `${question.answer.value}?`);
    }

    case 'fill_blank': {
      if (question.payload.input === 'tokens') {
        const tokens = question.payload.tokens ?? [];
        return tap(
          `token-${right ? question.answer.value : firstOther(tokens, question.answer.value)}`,
        );
      }
      return typeText(right ? question.answer.value : `${question.answer.value}?`);
    }

    case 'code_ordering': {
      const order = right ? question.answer.order : [...question.answer.order].reverse();
      return order.flatMap((id) => tap(`bank-${id}`));
    }

    case 'debugging': {
      const commands: Command[] = [];
      const { line_id: lineId, option_id: optionId } = question.answer;
      if (lineId !== undefined) {
        const lines = (question.payload.lines ?? []).map((l) => l.id);
        commands.push(...tap(`line-${right ? lineId : firstOther(lines, lineId)}`));
      }
      if (optionId !== undefined) {
        // With both parts asked, one wrong part is enough; the fix stays right so the wrong
        // answer is a near miss rather than two mistakes.
        const options = (question.payload.options ?? []).map((o) => o.id);
        const fix = right || lineId !== undefined ? optionId : firstOther(options, optionId);
        commands.push(...tap(`fix-${fix}`));
      }
      return commands;
    }

    case 'concept_matching': {
      const entries = Object.entries(question.answer.pairs);
      // Wrong: every concept gets the next concept's definition — a full derangement.
      const definitions = right
        ? entries.map(([, definition]) => definition)
        : entries.map((_, index) => entries[(index + 1) % entries.length]![1]);
      return entries.flatMap(([concept], index) => [
        ...tap(`concept-${concept}`),
        ...tap(`definition-${definitions[index]!}`),
      ]);
    }
  }
};

/**
 * Answer one question and check it, leaving its feedback on screen. The feedback appears
 * BELOW the question, so on a tall page — concept matching, a long snippet — it is under the
 * fold: scrolled to, not waited for.
 */
export const checkAnswer = (question: ContentQuestion, mode: AnswerMode): Command[] => [
  ...answerInput(question, mode),
  ...tap('check-answer'),
  scrollTo('answer-feedback'),
];

/**
 * Answer one question, check it, read the feedback and move on — and wait for the feedback to
 * be GONE before anything else. Consecutive questions reuse ids (`tf-true`, `check-answer`);
 * tapped while the old page is still leaving, a tap lands on the graded question and nothing
 * happens.
 */
export const answerQuestion = (question: ContentQuestion, mode: AnswerMode): Command[] => [
  ...checkAnswer(question, mode),
  ...tap('answer-feedback-continue'),
  { extendedWaitUntil: { notVisible: { id: 'answer-feedback' }, timeout: WAIT_MS } },
];

export interface PlayOptions {
  mode?: AnswerMode;
  /**
   * Stop on the last question's feedback instead of finishing, so the calling flow can assert
   * what that answer did — the out-of-lives card appears there and nowhere else.
   */
  stopAtLastFeedback?: boolean;
}

/**
 * Plays a whole lesson, page by page, exactly as the player splits it: consecutive
 * explanation blocks are one reading page, and every question is a page of its own
 * (`src/features/lesson/logic/pages.ts`). Ends on the completion screen, unless told to stop
 * on the last feedback.
 */
export const playLesson = (
  lesson: LessonFile,
  { mode = 'correct', stopAtLastFeedback = false }: PlayOptions = {},
): Command[] => {
  const commands: Command[] = [];
  const lastQuestion = lesson.blocks.findLastIndex((block) => block.type === 'question');
  let reading = false;

  const flushReading = () => {
    if (reading) commands.push(...tap('lesson-continue'));
    reading = false;
  };

  for (const [index, block] of lesson.blocks.entries()) {
    if (block.type !== 'question') {
      reading = true;
      continue;
    }

    flushReading();
    if (stopAtLastFeedback && index === lastQuestion) {
      commands.push(...checkAnswer(block.question, mode));
      return commands;
    }
    commands.push(...answerQuestion(block.question, mode));
  }
  flushReading();

  commands.push(waitFor('lesson-complete'));
  return commands;
};

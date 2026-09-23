import type { ContentQuestion } from '../../src/lib/content/schema';

/**
 * Does every answer point at something the learner can actually pick?
 *
 * The schema checks that an answer has the right SHAPE. It cannot check that the shape refers
 * to anything: a `multiple_choice` whose `option_id` is a typo, a `code_ordering` that forgets
 * one line, a `concept_matching` pairing a concept with a definition that was renamed. Every
 * one of those parses, publishes, renders — and is then graded wrong for every learner who
 * answers it correctly, forever, with nothing in any log to say so.
 *
 * At a seed of forty questions that is caught by eye. At the four hundred of Phase 19 it is a
 * matter of when, so it is a rule.
 */

type Mode = 'exact' | 'trimmed' | 'whitespace_insensitive' | 'case_insensitive';

/**
 * The server's `normalize_answer_text`, reproduced exactly (question_grading.sql).
 *
 * A choice-style `predict_output` is graded by resolving the picked option's English text and
 * comparing it with `answer.value` under this normalisation. "Matches when I read it" is not
 * the test; "matches after the server's normalisation" is.
 */
export const normalizeAnswerText = (text: string, mode: Mode): string => {
  const straightened = text
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—―]/g, '-')
    .replace(/\r\n/g, '\n');

  // Postgres `btrim(v, E' \t\n\r')` — only these four characters, not every Unicode space.
  const btrim = (value: string) => value.replace(/^[ \t\n\r]+|[ \t\n\r]+$/g, '');

  switch (mode) {
    case 'exact':
      return straightened;
    case 'trimmed':
      return btrim(straightened);
    case 'whitespace_insensitive':
      return btrim(straightened.replace(/\s+/g, ' '));
    case 'case_insensitive':
      return btrim(straightened).toLowerCase();
  }
};

const duplicates = (ids: string[]): string[] => [
  ...new Set(ids.filter((id, index) => ids.indexOf(id) !== index)),
];

const missing = (wanted: string[], available: string[]): string[] =>
  wanted.filter((id) => !available.includes(id));

/** Every problem with where this question's answer points. Empty means gradeable. */
export const answerReferenceProblems = (question: ContentQuestion): string[] => {
  const problems: string[] = [];

  const idsOf = (items: { id: string }[] | undefined, what: string): string[] => {
    const ids = (items ?? []).map((item) => item.id);
    for (const id of duplicates(ids)) problems.push(`two ${what} share the id "${id}"`);
    return ids;
  };

  switch (question.type) {
    case 'multiple_choice': {
      const ids = idsOf(question.payload.options, 'options');
      if (!ids.includes(question.answer.option_id)) {
        problems.push(`answer.option_id "${question.answer.option_id}" is not one of the options`);
      }
      break;
    }

    case 'multiple_select': {
      const ids = idsOf(question.payload.options, 'options');
      for (const id of missing(question.answer.option_ids, ids)) {
        problems.push(`answer.option_ids includes "${id}", which is not one of the options`);
      }
      for (const id of duplicates(question.answer.option_ids)) {
        problems.push(`answer.option_ids lists "${id}" twice`);
      }
      // All-or-nothing grading with every option correct is a free point, not a question.
      if (new Set(question.answer.option_ids).size >= ids.length) {
        problems.push('every option is correct, so there is nothing to decide');
      }
      break;
    }

    case 'predict_output': {
      if (question.payload.input !== 'choice') break;

      idsOf(question.payload.options, 'options');
      const mode = question.answer.match_mode;
      const expected = normalizeAnswerText(question.answer.value, mode);
      const matching = (question.payload.options ?? []).filter(
        (option) => normalizeAnswerText(option.text.en, mode) === expected,
      );

      if (matching.length === 0) {
        problems.push(
          'no option matches answer.value after normalisation, so it can never be answered right',
        );
      } else if (matching.length > 1) {
        problems.push(
          `${matching.length} options match answer.value (${matching
            .map((option) => option.id)
            .join(', ')}), so two different picks are both "correct"`,
        );
      }
      break;
    }

    case 'fill_blank': {
      if (question.payload.input !== 'tokens') break;

      // With a token bank the learner can only submit what is in the bank.
      const bank = (question.payload.tokens ?? []).map((token) =>
        normalizeAnswerText(token, question.answer.match_mode),
      );
      const accepted = [question.answer.value, ...question.answer.accepted_answers].map((value) =>
        normalizeAnswerText(value, question.answer.match_mode),
      );
      if (!accepted.some((value) => bank.includes(value))) {
        problems.push(`answer "${question.answer.value}" is not one of the tokens in the bank`);
      }
      break;
    }

    case 'code_ordering': {
      const ids = idsOf(question.payload.lines, 'lines');
      const order = question.answer.order;
      for (const id of missing(order, ids)) {
        problems.push(`answer.order includes "${id}", which is not one of the lines`);
      }
      for (const id of missing(ids, order)) {
        problems.push(`line "${id}" is missing from answer.order`);
      }
      for (const id of duplicates(order)) {
        problems.push(`answer.order lists "${id}" twice`);
      }
      break;
    }

    case 'debugging': {
      const lineIds = idsOf(question.payload.lines, 'lines');
      const optionIds = idsOf(question.payload.options, 'options');
      const { line_id: lineId, option_id: optionId } = question.answer;
      if (lineId !== undefined && !lineIds.includes(lineId)) {
        problems.push(`answer.line_id "${lineId}" is not one of the lines`);
      }
      if (optionId !== undefined && !optionIds.includes(optionId)) {
        problems.push(`answer.option_id "${optionId}" is not one of the options`);
      }
      break;
    }

    case 'concept_matching': {
      const conceptIds = idsOf(question.payload.concepts, 'concepts');
      const definitionIds = idsOf(question.payload.definitions, 'definitions');
      const pairs = question.answer.pairs;
      const paired = Object.keys(pairs);

      for (const id of missing(conceptIds, paired)) {
        problems.push(`concept "${id}" has no pair in answer.pairs`);
      }
      for (const id of missing(paired, conceptIds)) {
        problems.push(`answer.pairs pairs "${id}", which is not one of the concepts`);
      }
      for (const definition of Object.values(pairs)) {
        if (!definitionIds.includes(definition)) {
          problems.push(`answer.pairs uses "${definition}", which is not one of the definitions`);
        }
      }
      // Matching is one-to-one on screen: a definition used twice means one concept can never
      // be placed where the answer key says it goes.
      for (const definition of duplicates(Object.values(pairs))) {
        problems.push(`definition "${definition}" is the answer for two concepts`);
      }
      break;
    }

    case 'true_false':
      break;
  }

  return problems;
};

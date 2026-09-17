import type { RenderableQuestion } from '@/services';

import { parseQuestion } from '../payloads';

/**
 * The payload parser is the boundary between what the server sent and what a renderer trusts.
 * A malformed payload must become `null` — skipped by the player — never a crash three
 * components down.
 */
const base = (type: RenderableQuestion['type'], payload: unknown): RenderableQuestion => ({
  id: 'q-1',
  type,
  difficulty: 'easy',
  prompt: 'Prompt',
  code_snippet: null,
  payload,
  has_hint: false,
  skill_tags: ['tag'],
});

const opts = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `o${i}`, text: `Option ${i}` }));

describe('parseQuestion', () => {
  it('parses multiple_choice with its options', () => {
    const parsed = parseQuestion(base('multiple_choice', { options: opts(3) }));
    expect(parsed?.type).toBe('multiple_choice');
  });

  it('rejects multiple_choice with a single option', () => {
    expect(parseQuestion(base('multiple_choice', { options: opts(1) }))).toBeNull();
  });

  it('requires at least three options for multiple_select', () => {
    expect(parseQuestion(base('multiple_select', { options: opts(2) }))).toBeNull();
    expect(parseQuestion(base('multiple_select', { options: opts(3) }))?.type).toBe('multiple_select');
  });

  it('accepts an empty payload for true_false', () => {
    expect(parseQuestion(base('true_false', {}))?.type).toBe('true_false');
  });

  it('tolerates a missing payload for true_false', () => {
    expect(parseQuestion(base('true_false', undefined))?.type).toBe('true_false');
  });

  describe('predict_output', () => {
    it('accepts free text', () => {
      expect(parseQuestion(base('predict_output', { input: 'text' }))?.type).toBe('predict_output');
    });

    it('requires options in choice mode', () => {
      expect(parseQuestion(base('predict_output', { input: 'choice' }))).toBeNull();
      expect(parseQuestion(base('predict_output', { input: 'choice', options: opts(2) }))).not.toBeNull();
    });

    it('rejects an unknown input mode', () => {
      expect(parseQuestion(base('predict_output', { input: 'voice' }))).toBeNull();
    });
  });

  describe('fill_blank', () => {
    it('requires tokens in token mode', () => {
      expect(parseQuestion(base('fill_blank', { input: 'tokens' }))).toBeNull();
      expect(parseQuestion(base('fill_blank', { input: 'tokens', tokens: ['a', 'b'] }))).not.toBeNull();
    });

    it('needs no tokens in text mode', () => {
      expect(parseQuestion(base('fill_blank', { input: 'text' }))).not.toBeNull();
    });
  });

  it('requires at least three lines for code_ordering', () => {
    const lines = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `l${i}`, text: `line ${i}` }));
    expect(parseQuestion(base('code_ordering', { lines: lines(2) }))).toBeNull();
    expect(parseQuestion(base('code_ordering', { lines: lines(3) }))?.type).toBe('code_ordering');
  });

  describe('debugging', () => {
    const lines = [{ id: 'a', text: 'x = 1' }, { id: 'b', text: 'print(y)' }];

    it('needs lines to select a line', () => {
      expect(parseQuestion(base('debugging', { mode: 'select_line' }))).toBeNull();
      expect(parseQuestion(base('debugging', { mode: 'select_line', lines }))).not.toBeNull();
    });

    it('needs options to choose a fix', () => {
      expect(parseQuestion(base('debugging', { mode: 'choose_fix' }))).toBeNull();
      expect(parseQuestion(base('debugging', { mode: 'choose_fix', options: opts(2) }))).not.toBeNull();
    });

    it('needs both for the combined mode', () => {
      expect(parseQuestion(base('debugging', { mode: 'both', lines }))).toBeNull();
      expect(parseQuestion(base('debugging', { mode: 'both', lines, options: opts(2) }))).not.toBeNull();
    });
  });

  it('parses concept_matching with both columns', () => {
    const parsed = parseQuestion(base('concept_matching', { concepts: opts(3), definitions: opts(3) }));
    expect(parsed?.type).toBe('concept_matching');
  });

  it('never renders a coding_challenge', () => {
    // Schema-only in V1 (SPEC §16); pretending to render it would be a fake feature.
    expect(parseQuestion(base('coding_challenge', {}))).toBeNull();
  });

  it('rejects a payload with an unknown key rather than guessing', () => {
    expect(parseQuestion(base('multiple_choice', { options: opts(2), answer: 'o0' }))).toBeNull();
  });
});

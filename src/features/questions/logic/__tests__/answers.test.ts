import { isAnswerComplete, toggleId } from '../answers';
import type { ParsedQuestion } from '../../payloads';

/**
 * `isAnswerComplete` gates the Check button. Too strict and a valid answer cannot be
 * submitted; too loose and a mis-tap burns an attempt on an empty answer.
 */
const opts = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `o${i}`, text: `Option ${i}` }));

describe('isAnswerComplete', () => {
  it('rejects a value of the wrong type outright', () => {
    const q: ParsedQuestion = { type: 'true_false', payload: {} };
    expect(isAnswerComplete(q, { type: 'multiple_choice', option_id: 'o0' })).toBe(false);
  });

  it('multiple_choice needs one option', () => {
    const q: ParsedQuestion = { type: 'multiple_choice', payload: { options: opts(3) } };
    expect(isAnswerComplete(q, { type: 'multiple_choice' })).toBe(false);
    expect(isAnswerComplete(q, { type: 'multiple_choice', option_id: 'o1' })).toBe(true);
  });

  it('multiple_select needs at least one option', () => {
    const q: ParsedQuestion = { type: 'multiple_select', payload: { options: opts(3) } };
    expect(isAnswerComplete(q, { type: 'multiple_select', option_ids: [] })).toBe(false);
    expect(isAnswerComplete(q, { type: 'multiple_select', option_ids: ['o2'] })).toBe(true);
  });

  it('true_false needs a boolean, and false counts', () => {
    const q: ParsedQuestion = { type: 'true_false', payload: {} };
    expect(isAnswerComplete(q, { type: 'true_false' })).toBe(false);
    expect(isAnswerComplete(q, { type: 'true_false', value: false })).toBe(true);
  });

  describe('predict_output', () => {
    it('in text mode needs non-blank text', () => {
      const q: ParsedQuestion = { type: 'predict_output', payload: { input: 'text' } };
      expect(isAnswerComplete(q, { type: 'predict_output', value: '   ' })).toBe(false);
      expect(isAnswerComplete(q, { type: 'predict_output', value: '34' })).toBe(true);
    });

    it('in choice mode needs an option, not text', () => {
      const q: ParsedQuestion = {
        type: 'predict_output',
        payload: { input: 'choice', options: opts(2) },
      };
      expect(isAnswerComplete(q, { type: 'predict_output', value: '34' })).toBe(false);
      expect(isAnswerComplete(q, { type: 'predict_output', option_id: 'o0' })).toBe(true);
    });
  });

  it('fill_blank needs non-blank text', () => {
    const q: ParsedQuestion = {
      type: 'fill_blank',
      payload: { input: 'tokens', tokens: ['a', 'b'] },
    };
    expect(isAnswerComplete(q, { type: 'fill_blank', value: '' })).toBe(false);
    expect(isAnswerComplete(q, { type: 'fill_blank', value: 'a' })).toBe(true);
  });

  it('code_ordering needs every line placed', () => {
    const q: ParsedQuestion = {
      type: 'code_ordering',
      payload: {
        lines: [
          { id: 'a', text: '' },
          { id: 'b', text: '' },
          { id: 'c', text: '' },
        ],
      },
    };
    expect(isAnswerComplete(q, { type: 'code_ordering', order: ['a', 'b'] })).toBe(false);
    expect(isAnswerComplete(q, { type: 'code_ordering', order: ['c', 'a', 'b'] })).toBe(true);
  });

  describe('debugging', () => {
    const lines = [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
    ];

    it('select_line needs a line', () => {
      const q: ParsedQuestion = { type: 'debugging', payload: { mode: 'select_line', lines } };
      expect(isAnswerComplete(q, { type: 'debugging' })).toBe(false);
      expect(isAnswerComplete(q, { type: 'debugging', line_id: 'a' })).toBe(true);
    });

    it('choose_fix needs an option', () => {
      const q: ParsedQuestion = {
        type: 'debugging',
        payload: { mode: 'choose_fix', options: opts(2) },
      };
      expect(isAnswerComplete(q, { type: 'debugging', line_id: 'a' })).toBe(false);
      expect(isAnswerComplete(q, { type: 'debugging', option_id: 'o0' })).toBe(true);
    });

    it('both needs both', () => {
      const q: ParsedQuestion = {
        type: 'debugging',
        payload: { mode: 'both', lines, options: opts(2) },
      };
      expect(isAnswerComplete(q, { type: 'debugging', line_id: 'a' })).toBe(false);
      expect(isAnswerComplete(q, { type: 'debugging', option_id: 'o0' })).toBe(false);
      expect(isAnswerComplete(q, { type: 'debugging', line_id: 'a', option_id: 'o0' })).toBe(true);
    });
  });

  it('concept_matching needs every concept paired', () => {
    const q: ParsedQuestion = {
      type: 'concept_matching',
      payload: { concepts: opts(3), definitions: opts(3) },
    };
    expect(isAnswerComplete(q, { type: 'concept_matching', pairs: { o0: 'o0', o1: 'o1' } })).toBe(
      false,
    );
    expect(
      isAnswerComplete(q, { type: 'concept_matching', pairs: { o0: 'o2', o1: 'o1', o2: 'o0' } }),
    ).toBe(true);
  });
});

describe('toggleId', () => {
  it('adds an id that is absent, at the end', () => {
    expect(toggleId(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('removes an id that is present', () => {
    expect(toggleId(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
  });

  it('does not mutate its input', () => {
    const ids = ['a'];
    toggleId(ids, 'b');
    expect(ids).toEqual(['a']);
  });
});

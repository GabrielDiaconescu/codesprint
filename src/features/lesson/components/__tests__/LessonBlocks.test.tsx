import { screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test-utils';
import type { LessonBlock } from '@/services';

import { LessonBlockView } from '../LessonBlocks';

/**
 * The renderers are where a leak would finally become visible to a learner, so the question
 * case is asserted from the other direction too: nothing resembling an answer may appear on
 * screen, whatever the block happens to contain.
 */
describe('LessonBlockView', () => {
  it('renders prose, unwrapping the source line breaks', async () => {
    const block: LessonBlock = {
      type: 'text',
      body: 'Python is a language\nfor writing instructions.',
    };
    await renderWithTheme(<LessonBlockView block={block} />);

    expect(screen.getByText('Python is a language for writing instructions.')).toBeOnTheScreen();
  });

  it('renders a code block with its output', async () => {
    const block: LessonBlock = { type: 'code', code: 'print("hi")', output: 'hi' };
    await renderWithTheme(<LessonBlockView block={block} />);

    expect(screen.getByText('hi')).toBeOnTheScreen();
  });

  it('names a callout for a screen reader, not just tints it', async () => {
    const block: LessonBlock = { type: 'callout', variant: 'mistake', body: 'Watch the quotes.' };
    await renderWithTheme(<LessonBlockView block={block} />);

    // A tinted box conveys nothing without sight (SPEC §47).
    expect(screen.getByLabelText('Common mistake. Watch the quotes.')).toBeOnTheScreen();
  });

  it('renders nothing for a question block, which belongs to its own page', async () => {
    const block: LessonBlock = {
      type: 'question',
      question: {
        id: 'q-1',
        type: 'true_false',
        difficulty: 'easy',
        prompt: 'Is it?',
        code_snippet: null,
        payload: {},
        has_hint: false,
        skill_tags: ['printing'],
      },
    };
    await renderWithTheme(<LessonBlockView block={block} />);

    expect(screen.queryByText('Is it?')).toBeNull();
  });
});

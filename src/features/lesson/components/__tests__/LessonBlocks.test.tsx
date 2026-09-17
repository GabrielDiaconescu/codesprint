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
    expect(
      screen.getByLabelText('Common mistake. Watch the quotes.'),
    ).toBeOnTheScreen();
  });

  describe('a question block', () => {
    const questionBlock: LessonBlock = {
      type: 'question',
      question: {
        id: 'q-1',
        type: 'predict_output',
        difficulty: 'medium',
        prompt: 'What does this print?',
        code_snippet: 'print(2 + 2)',
        payload: { input: 'text' },
        has_hint: true,
        skill_tags: ['printing'],
      },
    };

    it('shows the prompt and the code', async () => {
      await renderWithTheme(<LessonBlockView block={questionBlock} />);

      expect(screen.getByText('What does this print?')).toBeOnTheScreen();
      expect(screen.getByTestId('question-q-1')).toBeOnTheScreen();
    });

    it('labels the difficulty and the kind of question', async () => {
      await renderWithTheme(<LessonBlockView block={questionBlock} />);

      expect(screen.getByText('Medium')).toBeOnTheScreen();
      expect(screen.getByText('Predict the output')).toBeOnTheScreen();
    });

    it('says plainly that answering is not available yet', async () => {
      // A control that looks live and does nothing is worse than an honest note (SPEC §59.12).
      await renderWithTheme(<LessonBlockView block={questionBlock} />);

      expect(screen.getByText(/Answering arrives in the next release/)).toBeOnTheScreen();
    });

    it('offers no way to answer, so nothing can be submitted into a void', async () => {
      await renderWithTheme(<LessonBlockView block={questionBlock} />);

      expect(screen.queryByRole('button')).toBeNull();
    });
  });
});

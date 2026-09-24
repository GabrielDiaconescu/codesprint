import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AnswerRefusedError, type RenderableQuestion } from '@/services';
import { renderWithProviders } from '@/test-utils';

import { QuestionPage } from '../QuestionPage';

/**
 * A refused answer (SPEC §22, §42) — as opposed to a failed one.
 *
 * Out of lives, the server takes nothing: no grade, no attempt, no life. The page must say so
 * with the ways forward, keep the selection, and not dress it up as a network error. Too fast,
 * it must say THAT, not "check your connection".
 */
const mockSubmit = jest.fn();

jest.mock('@/services', () => ({
  ...jest.requireActual<Record<string, unknown>>('@/services'),
  services: {
    content: { submitAnswer: (...args: unknown[]) => mockSubmit(...args) as unknown },
    analytics: { capture: jest.fn() },
  },
}));

// The card has its own tests and its own data (the rewarded allowance); here it only matters
// that it is shown.
jest.mock('@/features/ads/components/RewardedLifeCard', () => ({
  RewardedLifeCard: () => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text testID="out-of-lives">out of lives</Text>;
  },
}));

const question: RenderableQuestion = {
  id: 'q-1',
  type: 'true_false',
  difficulty: 'easy',
  prompt: 'Is Python read top to bottom?',
  code_snippet: null,
  payload: {},
  has_hint: false,
  skill_tags: ['basics'],
};

const renderPage = () =>
  renderWithProviders(
    <QuestionPage
      question={question}
      number={1}
      total={5}
      onContinue={jest.fn()}
      onSkip={jest.fn()}
    />,
  );

beforeEach(() => jest.clearAllMocks());

describe('QuestionPage, when the server refuses the answer', () => {
  it('offers the ways forward when out of lives, and keeps the selection', async () => {
    mockSubmit.mockRejectedValue(new AnswerRefusedError('out-of-lives'));
    await renderPage();

    await fireEvent.press(screen.getByTestId('tf-true'));
    await fireEvent.press(screen.getByTestId('check-answer'));

    await waitFor(() => expect(screen.getByTestId('out-of-lives')).toBeOnTheScreen());
    // Not a network error: the card says what happened.
    expect(screen.queryByTestId('submit-error')).toBeNull();
    expect(screen.queryByTestId('answer-feedback')).toBeNull();
    // Still selected, so Check can be pressed again the moment a life is back.
    expect(screen.getByTestId('tf-true').props.accessibilityState).toMatchObject({
      selected: true,
    });
  });

  it('asks the learner to slow down when rate-limited — not to check their connection', async () => {
    mockSubmit.mockRejectedValue(new AnswerRefusedError('rate-limited'));
    await renderPage();

    await fireEvent.press(screen.getByTestId('tf-true'));
    await fireEvent.press(screen.getByTestId('check-answer'));

    await waitFor(() =>
      expect(screen.getByTestId('submit-error')).toHaveTextContent(/lot of answers very quickly/),
    );
    expect(screen.queryByTestId('out-of-lives')).toBeNull();
  });

  it('keeps the generic retry for an answer that simply did not arrive', async () => {
    mockSubmit.mockRejectedValue(new TypeError('Network request failed'));
    await renderPage();

    await fireEvent.press(screen.getByTestId('tf-true'));
    await fireEvent.press(screen.getByTestId('check-answer'));

    await waitFor(() =>
      expect(screen.getByTestId('submit-error')).toHaveTextContent(/Couldn't check your answer/),
    );
    expect(screen.queryByTestId('out-of-lives')).toBeNull();
  });
});

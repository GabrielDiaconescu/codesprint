import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test-utils';

import { AnswerFeedback } from '../AnswerFeedback';

const baseProps = {
  explanation: 'str(3) is the string "3", so + joins them into "34".',
  primaryActionLabel: 'Continue',
  onPrimaryAction: jest.fn(),
  correctLabel: 'Correct',
  incorrectLabel: 'Not quite',
};

/** One render per test — RNTL cleans up between tests, so no manual unmount is needed. */
describe('AnswerFeedback', () => {
  it('states a correct result in text, not colour alone (SPEC §47)', async () => {
    await renderWithTheme(<AnswerFeedback {...baseProps} status="correct" />);
    expect(screen.getByText('Correct')).toBeOnTheScreen();
  });

  it('states an incorrect result in text, without shaming language (SPEC §18)', async () => {
    await renderWithTheme(<AnswerFeedback {...baseProps} status="incorrect" />);
    expect(screen.getByText('Not quite')).toBeOnTheScreen();
  });

  it('always shows the explanation, including when the answer was wrong (SPEC §18)', async () => {
    await renderWithTheme(<AnswerFeedback {...baseProps} status="incorrect" />);
    expect(screen.getByText(baseProps.explanation)).toBeOnTheScreen();
  });

  it('shows a hint on an incorrect answer', async () => {
    await renderWithTheme(
      <AnswerFeedback {...baseProps} status="incorrect" hint="Both sides are strings." />,
    );
    expect(screen.getByText('Both sides are strings.')).toBeOnTheScreen();
  });

  it('hides the hint on a correct answer', async () => {
    await renderWithTheme(
      <AnswerFeedback {...baseProps} status="correct" hint="Both sides are strings." />,
    );
    expect(screen.queryByText('Both sides are strings.')).not.toBeOnTheScreen();
  });

  it('shows XP when some was awarded', async () => {
    await renderWithTheme(<AnswerFeedback {...baseProps} status="correct" xpAwarded={10} />);
    expect(screen.getByText('+10 XP')).toBeOnTheScreen();
  });

  it('hides the XP line when zero was awarded', async () => {
    // A correct answer on a retry can award nothing — "+0 XP" would be noise.
    await renderWithTheme(<AnswerFeedback {...baseProps} status="correct" xpAwarded={0} />);
    expect(screen.queryByText('+0 XP')).not.toBeOnTheScreen();
  });

  it('fires the primary action', async () => {
    const onPrimaryAction = jest.fn();
    await renderWithTheme(
      <AnswerFeedback {...baseProps} status="correct" onPrimaryAction={onPrimaryAction} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onPrimaryAction).toHaveBeenCalledTimes(1);
  });
});

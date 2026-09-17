import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test-utils';

import { ConceptMatching } from '../ConceptMatching';

const payload = {
  concepts: [
    { id: 'syntax', text: 'SyntaxError' },
    { id: 'name', text: 'NameError' },
    { id: 'type', text: 'TypeError' },
  ],
  definitions: [
    { id: 'not-valid', text: 'Not valid Python' },
    { id: 'never-seen', text: 'A name never given' },
    { id: 'wrong-kind', text: 'Wrong kind of value' },
  ],
};

describe('ConceptMatching', () => {
  it('pairs a concept with the next definition tapped', async () => {
    const onChange = jest.fn();
    await renderWithTheme(
      <ConceptMatching
        questionId="q"
        payload={payload}
        value={{ type: 'concept_matching', pairs: {} }}
        onChange={onChange}
        disabled={false}
      />,
    );

    await fireEvent.press(screen.getByTestId('concept-syntax'));
    expect(screen.getByTestId('concept-syntax')).toHaveProp(
      'accessibilityLabel',
      'SyntaxError, waiting for a definition',
    );

    await fireEvent.press(screen.getByTestId('definition-not-valid'));
    expect(onChange).toHaveBeenCalledWith({
      type: 'concept_matching',
      pairs: { syntax: 'not-valid' },
    });
  });

  it('ignores a definition tap when no concept is waiting', async () => {
    const onChange = jest.fn();
    await renderWithTheme(
      <ConceptMatching
        questionId="q"
        payload={payload}
        value={{ type: 'concept_matching', pairs: {} }}
        onChange={onChange}
        disabled={false}
      />,
    );

    await fireEvent.press(screen.getByTestId('definition-not-valid'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('unpairs a paired concept when tapped again', async () => {
    const onChange = jest.fn();
    await renderWithTheme(
      <ConceptMatching
        questionId="q"
        payload={payload}
        value={{ type: 'concept_matching', pairs: { syntax: 'not-valid' } }}
        onChange={onChange}
        disabled={false}
      />,
    );

    await fireEvent.press(screen.getByTestId('concept-syntax'));
    expect(onChange).toHaveBeenCalledWith({ type: 'concept_matching', pairs: {} });
  });

  it('releases a definition from its previous concept when reassigned', async () => {
    const onChange = jest.fn();
    await renderWithTheme(
      <ConceptMatching
        questionId="q"
        payload={payload}
        value={{ type: 'concept_matching', pairs: { syntax: 'not-valid' } }}
        onChange={onChange}
        disabled={false}
      />,
    );

    await fireEvent.press(screen.getByTestId('concept-name'));
    await fireEvent.press(screen.getByTestId('definition-not-valid'));
    expect(onChange).toHaveBeenCalledWith({ type: 'concept_matching', pairs: { name: 'not-valid' } });
  });

  it('names a pairing for a screen reader', async () => {
    await renderWithTheme(
      <ConceptMatching
        questionId="q"
        payload={payload}
        value={{ type: 'concept_matching', pairs: { syntax: 'not-valid' } }}
        onChange={jest.fn()}
        disabled={false}
      />,
    );

    expect(screen.getByTestId('concept-syntax')).toHaveProp(
      'accessibilityLabel',
      'SyntaxError matched with Not valid Python. Tap to undo.',
    );
  });

  it('ignores every tap once disabled', async () => {
    const onChange = jest.fn();
    await renderWithTheme(
      <ConceptMatching
        questionId="q"
        payload={payload}
        value={{ type: 'concept_matching', pairs: {} }}
        onChange={onChange}
        disabled
      />,
    );

    await fireEvent.press(screen.getByTestId('concept-syntax'));
    await fireEvent.press(screen.getByTestId('definition-not-valid'));
    expect(onChange).not.toHaveBeenCalled();
  });
});

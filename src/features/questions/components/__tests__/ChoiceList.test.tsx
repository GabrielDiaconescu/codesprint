import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test-utils';

import { ChoiceList } from '../ChoiceList';

const options = [
  { id: 'a', text: 'Alpha' },
  { id: 'b', text: 'Beta' },
  { id: 'c', text: 'Gamma' },
];

describe('ChoiceList', () => {
  it('reports the tapped option', async () => {
    const onSelect = jest.fn();
    await renderWithTheme(<ChoiceList options={options} selectedIds={[]} onSelect={onSelect} />);

    await fireEvent.press(screen.getByTestId('choice-b'));
    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('exposes single-choice rows as radios with their selected state', async () => {
    await renderWithTheme(
      <ChoiceList options={options} selectedIds={['b']} onSelect={jest.fn()} />,
    );

    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByTestId('choice-b')).toHaveProp('accessibilityState', {
      selected: true,
      checked: true,
    });
    expect(screen.getByTestId('choice-a')).toHaveProp('accessibilityState', {
      selected: false,
      checked: false,
    });
  });

  it('exposes multi-choice rows as checkboxes', async () => {
    await renderWithTheme(
      <ChoiceList multi options={options} selectedIds={[]} onSelect={jest.fn()} />,
    );

    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  it('ignores taps once disabled', async () => {
    const onSelect = jest.fn();
    await renderWithTheme(
      <ChoiceList options={options} selectedIds={['a']} onSelect={onSelect} disabled />,
    );

    await fireEvent.press(screen.getByTestId('choice-b'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  describe('after grading', () => {
    /**
     * The marking is named in the label, not only drawn: a screen-reader user must hear which
     * row was right and which was their mistake (SPEC §47).
     */
    it('names the correct answer the learner chose', async () => {
      await renderWithTheme(
        <ChoiceList
          options={options}
          selectedIds={['a']}
          onSelect={jest.fn()}
          disabled
          correctIds={['a']}
        />,
      );

      expect(screen.getByTestId('choice-a')).toHaveProp(
        'accessibilityLabel',
        'Alpha. Correct answer, chosen',
      );
    });

    it('names the wrong choice and the missed correct answer', async () => {
      await renderWithTheme(
        <ChoiceList
          options={options}
          selectedIds={['b']}
          onSelect={jest.fn()}
          disabled
          correctIds={['a']}
        />,
      );

      expect(screen.getByTestId('choice-b')).toHaveProp(
        'accessibilityLabel',
        'Beta. Your answer, incorrect',
      );
      expect(screen.getByTestId('choice-a')).toHaveProp(
        'accessibilityLabel',
        'Alpha. Correct answer, not chosen',
      );
    });

    it('leaves an untouched wrong option unlabelled', async () => {
      await renderWithTheme(
        <ChoiceList
          options={options}
          selectedIds={['b']}
          onSelect={jest.fn()}
          disabled
          correctIds={['a']}
        />,
      );

      expect(screen.getByTestId('choice-c')).toHaveProp('accessibilityLabel', 'Gamma');
    });
  });
});

import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test-utils';

import { OptionList } from '../OptionList';

const options = [
  {
    value: 'complete_beginner',
    label: 'Complete beginner',
    description: "I've never written code.",
  },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
];

describe('OptionList', () => {
  it('reports the chosen value', async () => {
    const onSelect = jest.fn();
    await renderWithTheme(
      <OptionList options={options} selected={undefined} onSelect={onSelect} />,
    );

    await fireEvent.press(screen.getByTestId('option-beginner'));
    expect(onSelect).toHaveBeenCalledWith('beginner');
  });

  /**
   * The accessibility contract is the reason this is a component rather than a list of
   * Buttons. A screen-reader user has to hear that these are alternatives and which one is
   * currently chosen; a row of buttons announces neither (SPEC §47).
   */
  describe('accessibility', () => {
    it('exposes each row as a radio', async () => {
      await renderWithTheme(
        <OptionList options={options} selected="beginner" onSelect={jest.fn()} />,
      );

      expect(screen.getAllByRole('radio')).toHaveLength(3);
    });

    it('announces which row is selected', async () => {
      await renderWithTheme(
        <OptionList options={options} selected="beginner" onSelect={jest.fn()} />,
      );

      expect(screen.getByTestId('option-beginner')).toHaveProp('accessibilityState', {
        selected: true,
        checked: true,
      });
    });

    it('announces the others as unselected', async () => {
      await renderWithTheme(
        <OptionList options={options} selected="beginner" onSelect={jest.fn()} />,
      );

      expect(screen.getByTestId('option-intermediate')).toHaveProp('accessibilityState', {
        selected: false,
        checked: false,
      });
    });

    it('reads the description as part of the option, not as loose text', async () => {
      await renderWithTheme(
        <OptionList options={options} selected={undefined} onSelect={jest.fn()} />,
      );

      expect(screen.getByTestId('option-complete_beginner')).toHaveProp(
        'accessibilityLabel',
        "Complete beginner. I've never written code.",
      );
    });

    it('falls back to the label alone when there is no description', async () => {
      await renderWithTheme(
        <OptionList options={options} selected={undefined} onSelect={jest.fn()} />,
      );

      expect(screen.getByTestId('option-beginner')).toHaveProp('accessibilityLabel', 'Beginner');
    });
  });

  it('shows every option', async () => {
    await renderWithTheme(
      <OptionList options={options} selected={undefined} onSelect={jest.fn()} />,
    );

    expect(screen.getByText('Complete beginner')).toBeOnTheScreen();
    expect(screen.getByText('Beginner')).toBeOnTheScreen();
    expect(screen.getByText('Intermediate')).toBeOnTheScreen();
  });

  it('works with numeric values, as the daily goal step needs', async () => {
    const onSelect = jest.fn();
    await renderWithTheme(
      <OptionList
        options={[
          { value: 5, label: '5 minutes' },
          { value: 10, label: '10 minutes' },
        ]}
        selected={5}
        onSelect={onSelect}
      />,
    );

    await fireEvent.press(screen.getByTestId('option-10'));
    expect(onSelect).toHaveBeenCalledWith(10);
  });
});

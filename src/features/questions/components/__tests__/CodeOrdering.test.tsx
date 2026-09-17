import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test-utils';

import { CodeOrdering } from '../CodeOrdering';

const payload = {
  lines: [
    { id: 'width', text: 'width = 4' },
    { id: 'height', text: 'height = 5' },
    { id: 'area', text: 'area = width * height' },
    { id: 'show', text: 'print(area)' },
  ],
};

describe('CodeOrdering', () => {
  it('starts with every line in the bank and nothing placed', async () => {
    await renderWithTheme(
      <CodeOrdering
        questionId="q"
        payload={payload}
        value={{ type: 'code_ordering', order: [] }}
        onChange={jest.fn()}
        disabled={false}
      />,
    );

    expect(screen.getByText('Tap lines below to add them here.')).toBeOnTheScreen();
    expect(screen.getByTestId('bank-width')).toBeOnTheScreen();
    expect(screen.queryByTestId('placed-width')).toBeNull();
  });

  it('appends a tapped bank line to the order', async () => {
    const onChange = jest.fn();
    await renderWithTheme(
      <CodeOrdering
        questionId="q"
        payload={payload}
        value={{ type: 'code_ordering', order: ['width'] }}
        onChange={onChange}
        disabled={false}
      />,
    );

    await fireEvent.press(screen.getByTestId('bank-height'));
    expect(onChange).toHaveBeenCalledWith({ type: 'code_ordering', order: ['width', 'height'] });
  });

  it('removes a tapped placed line', async () => {
    const onChange = jest.fn();
    await renderWithTheme(
      <CodeOrdering
        questionId="q"
        payload={payload}
        value={{ type: 'code_ordering', order: ['width', 'height'] }}
        onChange={onChange}
        disabled={false}
      />,
    );

    await fireEvent.press(screen.getByTestId('placed-width'));
    expect(onChange).toHaveBeenCalledWith({ type: 'code_ordering', order: ['height'] });
  });

  it('shows placed lines numbered, in the order placed', async () => {
    await renderWithTheme(
      <CodeOrdering
        questionId="q"
        payload={payload}
        value={{ type: 'code_ordering', order: ['show', 'width'] }}
        onChange={jest.fn()}
        disabled={false}
      />,
    );

    expect(screen.getByTestId('placed-show')).toHaveProp('accessibilityLabel', 'Line 1: print(area). Tap to remove.');
    expect(screen.getByTestId('placed-width')).toHaveProp('accessibilityLabel', 'Line 2: width = 4. Tap to remove.');
  });

  it('hides the bank once every line is placed', async () => {
    await renderWithTheme(
      <CodeOrdering
        questionId="q"
        payload={payload}
        value={{ type: 'code_ordering', order: ['width', 'height', 'area', 'show'] }}
        onChange={jest.fn()}
        disabled={false}
      />,
    );

    expect(screen.queryByText('Available lines')).toBeNull();
  });

  it('does not present the authored order in the bank', async () => {
    // The authored order is the answer; presenting it would give the question away.
    await renderWithTheme(
      <CodeOrdering
        questionId="q"
        payload={payload}
        value={{ type: 'code_ordering', order: [] }}
        onChange={jest.fn()}
        disabled={false}
      />,
    );

    const bankTexts = ['width', 'height', 'area', 'show'].map((id) =>
      screen.getByTestId(`bank-${id}`),
    );
    // Each exists; the order on screen is checked through the accessibility tree order.
    expect(bankTexts).toHaveLength(4);
    const rendered = screen.getAllByLabelText(/Tap to add\.$/).map((node) => node.props.accessibilityLabel);
    expect(rendered).not.toEqual(payload.lines.map((l) => `${l.text}. Tap to add.`));
  });
});

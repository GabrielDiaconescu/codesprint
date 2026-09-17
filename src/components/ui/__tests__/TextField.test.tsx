import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test-utils';

import { TextField } from '../TextField';

const noop = () => {};

describe('TextField', () => {
  it('reports what the user types', async () => {
    const onChangeText = jest.fn();
    await renderWithTheme(
      <TextField testID="email" label="Email" value="" onChangeText={onChangeText} />,
    );

    fireEvent.changeText(screen.getByTestId('email'), 'user@example.com');
    expect(onChangeText).toHaveBeenCalledWith('user@example.com');
  });

  /**
   * The keyboard settings are the whole reason this component exists rather than a bare
   * TextInput. An autocapitalised email or an autocorrected password fails with an error the
   * user cannot see, because the field shows dots.
   */
  it('disables autocapitalisation, autocorrect and spellcheck', async () => {
    await renderWithTheme(<TextField testID="email" label="Email" value="" onChangeText={noop} />);

    expect(screen.getByTestId('email')).toHaveProp('autoCapitalize', 'none');
    expect(screen.getByTestId('email')).toHaveProp('autoCorrect', false);
    expect(screen.getByTestId('email')).toHaveProp('spellCheck', false);
  });

  describe('secure fields', () => {
    it('masks the value by default', async () => {
      await renderWithTheme(
        <TextField testID="password" label="Password" value="hunter2" onChangeText={noop} secure />,
      );

      expect(screen.getByTestId('password')).toHaveProp('secureTextEntry', true);
    });

    it('reveals and re-hides the value on request', async () => {
      await renderWithTheme(
        <TextField
          testID="password"
          label="Password"
          value="hunter2"
          onChangeText={noop}
          secure
          showPasswordLabel="Show password"
          hidePasswordLabel="Hide password"
        />,
      );

      // fireEvent is async in RNTL v14: without the await the state update has not landed.
      await fireEvent.press(screen.getByRole('button', { name: 'Show password' }));
      expect(screen.getByTestId('password')).toHaveProp('secureTextEntry', false);

      await fireEvent.press(screen.getByRole('button', { name: 'Hide password' }));
      expect(screen.getByTestId('password')).toHaveProp('secureTextEntry', true);
    });

    it('has no reveal control when the field is not secure', async () => {
      await renderWithTheme(
        <TextField testID="email" label="Email" value="" onChangeText={noop} />,
      );

      expect(screen.queryByRole('button')).toBeNull();
    });
  });

  describe('messages', () => {
    it('shows an error', async () => {
      await renderWithTheme(
        <TextField
          testID="email"
          label="Email"
          value="nope"
          onChangeText={noop}
          error="That doesn't look like an email address."
        />,
      );

      expect(screen.getByText("That doesn't look like an email address.")).toBeOnTheScreen();
    });

    it('announces the error as part of the field, not as a stray line of text', async () => {
      // SPEC §47: a screen-reader user must hear which field the problem belongs to.
      await renderWithTheme(
        <TextField
          testID="email"
          label="Email"
          value="nope"
          onChangeText={noop}
          error="Enter a valid address."
        />,
      );

      expect(screen.getByTestId('email')).toHaveProp(
        'accessibilityLabel',
        'Email. Enter a valid address.',
      );
    });

    it('hides the hint while an error is showing, so the two never stack', async () => {
      await renderWithTheme(
        <TextField
          testID="password"
          label="Password"
          value="x"
          onChangeText={noop}
          hint="At least 8 characters."
          error="Use at least 8 characters."
        />,
      );

      expect(screen.queryByText('At least 8 characters.')).toBeNull();
      expect(screen.getByText('Use at least 8 characters.')).toBeOnTheScreen();
    });

    it('shows the hint when there is no error', async () => {
      await renderWithTheme(
        <TextField
          testID="password"
          label="Password"
          value=""
          onChangeText={noop}
          hint="At least 8 characters."
        />,
      );

      expect(screen.getByText('At least 8 characters.')).toBeOnTheScreen();
    });
  });
});

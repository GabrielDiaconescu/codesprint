import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';

import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

export interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  /** Rendered under the field. Presence also drives the error styling. */
  error?: string;
  /** Persistent guidance, shown only while there is no error. */
  hint?: string;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
  editable?: boolean;
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
  testID?: string;
}

/**
 * Text field (SPEC §8, §47).
 *
 * Two details that are easy to miss and expensive to get wrong:
 *
 *   * autoCorrect / autoCapitalize / spellCheck are OFF. A keyboard that capitalises the first
 *     letter of an email address or "corrects" a password produces a failure the user cannot
 *     see, because the field shows dots.
 *   * the error is icon + text, never colour alone (SPEC §47), and is wired to the input via
 *     accessibilityLabel so a screen reader announces the problem with the field rather than
 *     as a stray line of text.
 */
export const TextField = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  hint,
  secure = false,
  keyboardType,
  autoComplete,
  textContentType,
  returnKeyType,
  onSubmitEditing,
  editable = true,
  showPasswordLabel = 'Show password',
  hidePasswordLabel = 'Hide password',
  testID,
}: TextFieldProps) => {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.primary
      : theme.colors.border;

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text variant="label" tone="secondary">
        {label}
      </Text>

      <View
        style={[
          styles.field,
          {
            borderColor,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surface,
            paddingHorizontal: theme.spacing.lg,
            minHeight: theme.a11y.minTouchTarget,
            opacity: editable ? 1 : 0.5,
          },
        ]}
      >
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          secureTextEntry={secure && !revealed}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          textContentType={textContentType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          editable={editable}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={error ? `${label}. ${error}` : label}
          accessibilityHint={hint}
          style={[
            styles.input,
            {
              color: theme.colors.textPrimary,
              fontFamily: theme.fontFamily.regular,
              paddingVertical: theme.spacing.md,
            },
          ]}
        />

        {secure && (
          <Pressable
            onPress={() => setRevealed((current) => !current)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={revealed ? hidePasswordLabel : showPasswordLabel}
            style={({ pressed }) => pressed && { opacity: theme.pressed.opacity }}
          >
            <Icon
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size="md"
              color={theme.colors.textSecondary}
            />
          </Pressable>
        )}
      </View>

      {error ? (
        <View style={[styles.message, { gap: theme.spacing.xs }]}>
          <Icon name="alert-circle" size="sm" color={theme.colors.danger} />
          <Text variant="caption" tone="danger" style={styles.messageText}>
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text variant="caption" tone="secondary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  input: { flex: 1, fontSize: 16 },
  message: { flexDirection: 'row', alignItems: 'flex-start' },
  messageText: { flex: 1 },
});

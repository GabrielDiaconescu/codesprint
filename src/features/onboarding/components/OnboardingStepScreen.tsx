import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button, ProgressBar, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

import { STEP_COUNT, stepNumber, stepProgress, type OnboardingStep } from '../logic/steps';

interface OnboardingStepScreenProps {
  step: OnboardingStep;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onContinue: () => void;
  continueLabel?: string;
  /** Disabled until the step has an answer; every step has a default where one makes sense. */
  canContinue?: boolean;
  busy?: boolean;
  /** Rendered next to Continue when the step is genuinely optional (SPEC §11). */
  skipLabel?: string;
  onSkip?: () => void;
}

/**
 * Shared shape for every onboarding step (SPEC §11).
 *
 * The progress bar is the honest part: six screens is short, and showing exactly how short
 * is what stops someone abandoning at step two. The count is derived from the step list, so
 * adding or removing a step cannot leave the label lying.
 */
export const OnboardingStepScreen = ({
  step,
  title,
  subtitle,
  children,
  onContinue,
  continueLabel,
  canContinue = true,
  busy = false,
  skipLabel,
  onSkip,
}: OnboardingStepScreenProps) => {
  const { t } = useTranslation('onboarding');
  const { t: commonT } = useTranslation('common');
  const theme = useTheme();

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ gap: theme.spacing.sm, paddingTop: theme.spacing.md }}>
          <ProgressBar
            value={stepProgress(step)}
            label={t('progress', { current: stepNumber(step), total: STEP_COUNT })}
          />
          <Text variant="label" tone="secondary">
            {t('progress', { current: stepNumber(step), total: STEP_COUNT })}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { gap: theme.spacing.lg }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: theme.spacing.xs }}>
            <Text variant="title" accessibilityRole="header">
              {title}
            </Text>
            {subtitle && (
              <Text variant="body" tone="secondary">
                {subtitle}
              </Text>
            )}
          </View>

          {children}
        </ScrollView>

        <View style={[styles.footer, { gap: theme.spacing.sm, paddingBottom: theme.spacing.lg }]}>
          <Button
            testID="onboarding-continue"
            label={continueLabel ?? commonT('actions.continue')}
            onPress={onContinue}
            disabled={!canContinue || busy}
            loading={busy}
            fullWidth
          />
          {skipLabel && onSkip && (
            <Button variant="ghost" label={skipLabel} onPress={onSkip} disabled={busy} />
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingVertical: 24 },
  footer: { justifyContent: 'flex-end' },
});

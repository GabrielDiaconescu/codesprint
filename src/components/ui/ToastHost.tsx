import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToastStore, type Toast, type ToastTone } from '@/store/toastStore';
import { useReducedMotion, useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

const TONE_ICON: Record<ToastTone, IconName> = {
  info: 'information-circle',
  success: 'checkmark-circle',
  error: 'alert-circle',
};

const ToastRow = ({ toast, dismissLabel }: { toast: Toast; dismissLabel: string }) => {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [dismiss, toast.id, toast.duration]);

  const toneColor: Record<ToastTone, string> = {
    info: theme.colors.textPrimary,
    success: theme.colors.success,
    error: theme.colors.danger,
  };

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.duration(theme.motion.fast)}
      exiting={reduceMotion ? undefined : FadeOutDown.duration(theme.motion.fast)}
      // Announced without stealing focus from whatever the user is doing.
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          padding: theme.spacing.md,
          gap: theme.spacing.sm,
        },
      ]}
    >
      <Icon name={TONE_ICON[toast.tone]} size="md" color={toneColor[toast.tone]} />
      <Text variant="bodySmall" style={styles.message}>
        {toast.message}
      </Text>
      <Pressable
        onPress={() => dismiss(toast.id)}
        accessibilityRole="button"
        accessibilityLabel={dismissLabel}
        hitSlop={12}
      >
        <Icon name="close" size="sm" color={theme.colors.textSecondary} />
      </Pressable>
    </Animated.View>
  );
};

/**
 * Renders the toast queue (SPEC §8). Mounted once, at the root layout.
 *
 * Sits above content but below modals, and never covers the bottom tab bar entirely.
 */
export const ToastHost = ({ dismissLabel }: { dismissLabel: string }) => {
  const toasts = useToastStore((s) => s.toasts);
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { bottom: insets.bottom + theme.spacing.xxl, gap: theme.spacing.sm }]}
    >
      {toasts.map((toast) => (
        <ToastRow key={toast.id} toast={toast} dismissLabel={dismissLabel} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 16, right: 16 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  message: { flex: 1 },
});

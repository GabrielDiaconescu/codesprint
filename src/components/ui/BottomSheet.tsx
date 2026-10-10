import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReducedMotion, useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';
import { useKeyboardHeight } from './useKeyboardHeight';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Accessible name for the close control. */
  closeLabel: string;
  testID?: string;
}

const DISMISS_DISTANCE = 120;

/**
 * Bottom sheet (SPEC §8).
 *
 * Built on React Native's Modal plus Reanimated rather than a third-party sheet library: the
 * V1 use cases (settings pickers, confirmations, out-of-lives prompt) need presentation and
 * drag-to-dismiss, not a full snap-point system. That keeps one fewer dependency (SPEC §59.13).
 *
 * Accessibility: the backdrop is a real button so a screen reader can dismiss the sheet, and
 * the drag gesture is never the only way out (SPEC §47).
 *
 * The sheet rises above the on-screen keyboard. A Modal has a window of its own, so nothing else
 * moves it: the keyboard would cover a sheet with text fields — the change-password sheet once
 * hid its second field and its button that way.
 */
export const BottomSheet = ({
  visible,
  onClose,
  title,
  children,
  closeLabel,
  testID,
}: BottomSheetProps) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  // The keyboard already covers the bottom safe area that the sheet pads for.
  const keyboardOffset = Math.max(0, useKeyboardHeight() - insets.bottom);
  const translateY = useSharedValue(0);

  const close = () => {
    translateY.value = 0;
    onClose();
  };

  const pan = Gesture.Pan()
    .onChange((event) => {
      // Downward drag only; upward drag must not detach the sheet from the bottom edge.
      translateY.value = Math.max(0, translateY.value + event.changeY);
    })
    .onEnd((event) => {
      if (translateY.value > DISMISS_DISTANCE || event.velocityY > 800) {
        runOnJS(close)();
      } else {
        translateY.value = reduceMotion ? 0 : withTiming(0, { duration: theme.motion.fast });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'slide'}
      onRequestClose={close}
      statusBarTranslucent
      testID={testID}
    >
      <View
        testID={testID ? `${testID}-frame` : undefined}
        style={[styles.root, { paddingBottom: keyboardOffset }]}
      >
        <Pressable
          style={styles.backdrop}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        />
        <GestureDetector gesture={pan}>
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.surface,
                borderTopLeftRadius: theme.radius.xl,
                borderTopRightRadius: theme.radius.xl,
                paddingBottom: insets.bottom + theme.spacing.lg,
                paddingHorizontal: theme.spacing.lg,
                paddingTop: theme.spacing.md,
                gap: theme.spacing.md,
              },
              sheetStyle,
            ]}
          >
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.grabber, { backgroundColor: theme.colors.border }]}
            />

            {title && (
              <View style={styles.header}>
                <Text variant="heading" heading style={styles.title}>
                  {title}
                </Text>
                <Pressable
                  onPress={close}
                  accessibilityRole="button"
                  accessibilityLabel={closeLabel}
                  hitSlop={12}
                  style={{ minWidth: theme.a11y.minTouchTarget / 2 }}
                >
                  <Icon name="close" size="lg" color={theme.colors.textSecondary} />
                </Pressable>
              </View>
            )}

            {children}
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: { width: '100%' },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flexShrink: 1 },
});

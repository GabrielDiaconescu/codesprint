import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  AnswerFeedback,
  Badge,
  BottomSheet,
  Button,
  Card,
  GameIcon,
  IconButton,
  Chip,
  CodeBlock,
  Divider,
  Icon,
  ProgressBar,
  ProgressRing,
  Skeleton,
  SkeletonLines,
  StateView,
  Text,
} from '@/components/ui';
import { useToastStore } from '@/store/toastStore';
import { useSettingsStore, type ThemePreference } from '@/store/settingsStore';
import { useReducedMotion, useTheme } from '@/theme';

/**
 * Component gallery — DEVELOPMENT ONLY (SPEC §57, Phase 2 device check).
 *
 * Renders every design-system component so light and dark mode, dynamic type, contrast and
 * reduce-motion can be checked on a real device in one place. It is not part of the product:
 * the route is hidden from the app UI and is only reachable by typing the path.
 *
 * Strings here are intentionally NOT localized — this screen never ships to a user, and
 * adding it to the i18n namespaces would pollute the translation files (SPEC §38).
 */

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.md, marginBottom: theme.spacing.xl }}>
      <Text variant="label" tone="secondary" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </Text>
      {children}
      <Divider />
    </View>
  );
};

const Row = ({ children }: { children: React.ReactNode }) => {
  const theme = useTheme();
  return <View style={[styles.row, { gap: theme.spacing.sm }]}>{children}</View>;
};

const SAMPLE_CODE = `# Type conversion
age = "21"
total = int(age) + 1

def greet(name: str) -> str:
    return f"Hello, {name}! You are {total}"

print(greet('Ada'))  # Hello, Ada! You are 22`;

export default function GalleryScreen() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const showToast = useToastStore((s) => s.show);
  const themePreference = useSettingsStore((s) => s.themePreference);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedChip, setSelectedChip] = useState('Beginner');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect'>('correct');
  const [loading, setLoading] = useState(false);

  const preferences: ThemePreference[] = ['system', 'light', 'dark'];

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxxl }}
    >
      <Section title="Environment">
        <Card appearance="outlined">
          <Text variant="bodySmall">Scheme: {theme.scheme}</Text>
          <Text variant="bodySmall">Reduce motion: {reduceMotion ? 'on' : 'off'}</Text>
        </Card>
        <Row>
          {preferences.map((preference) => (
            <Chip
              key={preference}
              label={preference}
              selected={themePreference === preference}
              onPress={() => setThemePreference(preference)}
            />
          ))}
        </Row>
      </Section>

      <Section title="Typography">
        <Text variant="display">Display 32</Text>
        <Text variant="title">Title 24</Text>
        <Text variant="heading">Heading 20</Text>
        <Text variant="subheading">Subheading 17</Text>
        <Text variant="body">Body 16 — the quick brown fox jumps over the lazy dog.</Text>
        <Text variant="bodyStrong">Body strong 16</Text>
        <Text variant="bodySmall" tone="secondary">
          Body small 14, secondary tone
        </Text>
        <Text variant="caption" tone="secondary">
          Caption 13
        </Text>
        <Text variant="mono">mono 14: total = int(age) + 1</Text>
        {/* SPEC §38: Romanian must render comma-below diacritics, not cedillas. */}
        <Text variant="body">Diacritice: ă â î ș ț / Ă Â Î Ș Ț</Text>
      </Section>

      <Section title="Buttons">
        <Button label="Primary" onPress={() => showToast({ message: 'Primary pressed' })} />
        <Button label="Challenge" variant="challenge" icon="flash" onPress={() => {}} />
        <Button label="Success" variant="success" icon="checkmark" onPress={() => {}} />
        <Button label="Secondary" variant="secondary" onPress={() => {}} />
        <Button label="Ghost" variant="ghost" onPress={() => {}} />
        <Button label="Danger" variant="danger" onPress={() => {}} />
        <Button label="With icon" icon="flash" onPress={() => {}} />
        <Button label="Large, full width" size="lg" fullWidth onPress={() => {}} />
        <Button label="Disabled" disabled onPress={() => {}} />
        <Button
          label={loading ? 'Checking…' : 'Tap to show loading'}
          loading={loading}
          onPress={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 1500);
          }}
        />
      </Section>

      <Section title="3D depth and round toggles">
        {/* Hold each of these down: the face should travel onto its rim and the rim should
            disappear. If anything here floats or blurs instead, the restyle regressed. */}
        <View style={styles.row}>
          <IconButton icon="moon" accessibilityLabel="Theme" onPress={() => {}} />
          <IconButton icon="settings" accessibilityLabel="Settings" onPress={() => {}} />
          <IconButton icon="language" badge="EN" accessibilityLabel="Language" onPress={() => {}} />
          <IconButton icon="play" tone="primary" accessibilityLabel="Play" onPress={() => {}} />
          <IconButton
            icon="flash"
            tone="challenge"
            accessibilityLabel="Challenge"
            onPress={() => {}}
          />
        </View>

        <Card tone="challenge">
          <Text variant="bodyStrong">Challenge card</Text>
        </Card>
        <Card tone="gold">
          <Text variant="bodyStrong">Goal met card</Text>
        </Card>
      </Section>

      <Section title="Game icons">
        {/* Full, then muted. The muted row is what a spent life and an unearned reward
            look like — the shape has to survive losing its colour. */}
        <View style={styles.row}>
          <GameIcon name="flame" size={40} />
          <GameIcon name="heart" size={40} />
          <GameIcon name="coin" size={40} />
          <GameIcon name="bolt" size={40} />
          <GameIcon name="star" size={40} />
          <GameIcon name="trophy" size={40} />
        </View>
        <View style={styles.row}>
          <GameIcon name="flame" size={40} muted />
          <GameIcon name="heart" size={40} muted />
          <GameIcon name="coin" size={40} muted />
          <GameIcon name="bolt" size={40} muted />
          <GameIcon name="star" size={40} muted />
          <GameIcon name="trophy" size={40} muted />
        </View>
      </Section>

      <Section title="Badges and chips">
        <Row>
          <Badge label="Neutral" />
          <Badge label="Premium" tone="accent" icon="star" />
          <Badge label="Correct" tone="success" icon="checkmark" />
          <Badge label="Locked" tone="danger" icon="lock-closed" />
        </Row>
        <Row>
          <Badge label="12 day streak" tone="streak" icon="flame" />
          <Badge label="2,840 XP" tone="xp" icon="sparkles" />
          <Badge label="Daily" tone="challenge" icon="flash" />
        </Row>
        <Row>
          {['Complete beginner', 'Beginner', 'Intermediate'].map((level) => (
            <Chip
              key={level}
              label={level}
              selected={selectedChip === level}
              onPress={() => setSelectedChip(level)}
            />
          ))}
        </Row>
      </Section>

      <Section title="Progress">
        <ProgressBar value={0.48} label="Today's goal" />
        <ProgressBar value={0.72} tone="success" label="Course completion" />
        <ProgressBar value={1.4} tone="streak" label="Clamped above one" />
        <Row>
          <ProgressRing value={0.25} label="Level progress">
            <Text variant="bodyStrong">25%</Text>
          </ProgressRing>
          <ProgressRing value={0.7} tone="success" size={88} label="Module progress">
            <Text variant="title">7</Text>
          </ProgressRing>
          <ProgressRing value={1} tone="streak" size={56} label="Complete">
            <Icon name="checkmark" size="md" color={theme.colors.streak} />
          </ProgressRing>
        </Row>
      </Section>

      <Section title="Code">
        <CodeBlock code={SAMPLE_CODE} showLineNumbers />
        <CodeBlock code={'print(str(3) + "4")'} output="34" />
        <CodeBlock
          code={'x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]  # long line scrolls horizontally'}
        />
      </Section>

      <Section title="Answer feedback">
        <Row>
          <Chip
            label="Correct"
            selected={feedback === 'correct'}
            onPress={() => setFeedback('correct')}
          />
          <Chip
            label="Incorrect"
            selected={feedback === 'incorrect'}
            onPress={() => setFeedback('incorrect')}
          />
        </Row>
        <AnswerFeedback
          status={feedback}
          correctLabel="Correct"
          incorrectLabel="Not quite"
          explanation={'`str(3)` is the string "3"; `+` joins strings, giving "34".'}
          hint="Remember that + concatenates when both sides are strings."
          hintLabel="HINT"
          xpAwarded={10}
          primaryActionLabel="Continue"
          onPrimaryAction={() => setFeedback(feedback === 'correct' ? 'incorrect' : 'correct')}
        />
      </Section>

      <Section title="Cards">
        <Card>
          <Text variant="heading">Elevated card</Text>
          <Text variant="bodySmall" tone="secondary">
            Raised from the background with a themed shadow.
          </Text>
        </Card>
        <Card appearance="outlined" onPress={() => showToast({ message: 'Card pressed' })}>
          <Text variant="heading">Outlined, pressable</Text>
          <Text variant="bodySmall" tone="secondary">
            Announced as a button to screen readers.
          </Text>
        </Card>
      </Section>

      <Section title="Loading">
        <Skeleton height={48} />
        <SkeletonLines lines={3} />
      </Section>

      <Section title="Overlays">
        <Button
          label="Open bottom sheet"
          variant="secondary"
          onPress={() => setSheetVisible(true)}
        />
        <Row>
          <Button
            label="Info toast"
            variant="ghost"
            onPress={() => showToast({ message: 'Saved your answer' })}
          />
          <Button
            label="Success"
            variant="ghost"
            onPress={() => showToast({ message: 'Lesson complete', tone: 'success' })}
          />
          <Button
            label="Error"
            variant="ghost"
            onPress={() => showToast({ message: 'No internet connection', tone: 'error' })}
          />
        </Row>
      </Section>

      <Section title="States">
        <View style={styles.stateBox}>
          <StateView
            icon="cloud-offline"
            title="No internet connection"
            body="Check your connection and try again."
            actionLabel="Try again"
            onAction={() => showToast({ message: 'Retry pressed' })}
          />
        </View>
        <View style={styles.stateBox}>
          <StateView
            icon="alert-circle"
            tone="danger"
            title="Something went wrong"
            body="We couldn't load this. Please try again."
            actionLabel="Try again"
            onAction={() => {}}
          />
        </View>
      </Section>

      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title="Out of lives"
        closeLabel="Close"
      >
        <Text variant="body" tone="secondary">
          Drag down or tap the backdrop to dismiss. Both work with a screen reader too.
        </Text>
        <Button label="Got it" fullWidth onPress={() => setSheetVisible(false)} />
      </BottomSheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { letterSpacing: 1.2 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  stateBox: { height: 260 },
});

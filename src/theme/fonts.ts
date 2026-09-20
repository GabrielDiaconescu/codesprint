/**
 * Fonts (SPEC §8).
 *
 * Both families are SIL OFL 1.1, which permits embedding in an application.
 *
 * - **Nunito** for UI. Rounded terminals on every stem, which is what makes the interface read
 *   as friendly rather than corporate — the letterforms carry as much of that as the colours
 *   do. It goes up to ExtraBold, and the heavy weights are the point: a level number or an XP
 *   total set in ExtraBold reads as a score, not as data. Nunito covers Latin Extended-A, so
 *   SPEC §38's Romanian comma-below diacritics (ș, ț) exist rather than being substituted with
 *   a cedilla — verify visually on device when the Romanian locale ships.
 * - **JetBrains Mono** for code. Disambiguates 0/O and 1/l/I, which matters when a learner is
 *   reading a Python snippet character by character. Deliberately NOT rounded: code is the one
 *   place in the app where playfulness would cost legibility.
 */
export const fontFamily = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_600SemiBold',
  semibold: 'Nunito_700Bold',
  bold: 'Nunito_800ExtraBold',
  /** Numbers, levels and anything that should read as a score. */
  heavy: 'Nunito_900Black',
  mono: 'JetBrainsMono_400Regular',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export type FontFamily = keyof typeof fontFamily;

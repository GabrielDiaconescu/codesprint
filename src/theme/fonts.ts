/**
 * Fonts (SPEC §8).
 *
 * Both families are SIL OFL 1.1, which permits embedding in an application.
 *
 * - **Inter** for UI. Chosen partly because SPEC §38 requires correct Romanian comma-below
 *   diacritics (ș, ț) — many fonts wrongly substitute a cedilla. Verify visually on device
 *   when the Romanian locale ships.
 * - **JetBrains Mono** for code. Disambiguates 0/O and 1/l/I, which matters when a learner is
 *   reading a Python snippet character by character.
 */
export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  mono: 'JetBrainsMono_400Regular',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export type FontFamily = keyof typeof fontFamily;

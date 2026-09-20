import { JetBrainsMono_400Regular, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
  useFonts,
} from '@expo-google-fonts/nunito';

/**
 * Loads the embedded font families (SPEC §8).
 *
 * Only the weights the type scale actually uses are listed — each one is a bundled asset, so
 * an unused weight is dead payload in the app binary.
 *
 * Returns `[loaded, error]`. The caller must keep the splash screen up until `loaded` is true,
 * otherwise the first frame renders in the system font and visibly reflows.
 */
export const useAppFonts = (): [boolean, Error | null] => {
  const [loaded, error] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  });

  return [loaded, error ?? null];
};

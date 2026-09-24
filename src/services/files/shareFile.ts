import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Hands a text document to the system share sheet as a FILE (SPEC §41 — data export).
 *
 * A file rather than text: Android passes shared text through a Binder transaction capped at
 * about 1 MB, and a year of an active learner's answers is past that — a text share would
 * crash exactly for the people with the most data. A file of any size goes to Files, Drive or
 * an email as an attachment.
 *
 * Written to the app's cache directory, which the OS may clear, and overwritten on the next
 * export: nothing personal is left lying around in permanent storage.
 */
export const shareTextFile = async ({
  fileName,
  content,
  mimeType,
  dialogTitle,
}: {
  fileName: string;
  content: string;
  mimeType: string;
  dialogTitle: string;
}): Promise<void> => {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('sharing is not available on this device');
  }

  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(content);

  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle, UTI: 'public.json' });
};

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { loadStoreSource, renderStoreFiles } from './listing';

/**
 * `npm run store:build` — writes the store listings from store/ (Phase 23):
 *
 *   store.config.json                   App Store Connect, via `npx eas-cli metadata:push`
 *   store/google-play/<locale>/*.txt    Google Play Console
 *
 * Both are committed and generated only here; a test fails when they drift from the source.
 */
const main = () => {
  const files = renderStoreFiles(loadStoreSource());
  for (const [path, content] of Object.entries(files)) {
    const absolute = join(process.cwd(), path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
    console.log(`  wrote ${path}`);
  }
};

if (/store[\\/]build/.test(process.argv[1] ?? '')) main();

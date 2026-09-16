import path from 'node:path';

import { ESLint, type Linter } from 'eslint';

/**
 * The architecture rule from SPEC §7 — "Components never import Supabase, RevenueCat,
 * AdMob, PostHog or Sentry directly" — is only real if it fails the build.
 *
 * This test lints code in memory through the project's own ESLint config, so the boundary
 * cannot be silently weakened by a future config edit.
 */
const projectRoot = path.resolve(__dirname, '..', '..');

// The real project config is loaded with require() rather than letting ESLint discover it:
// ESLint's config loader uses dynamic import, which Jest's VM rejects without
// --experimental-vm-modules. eslint.config.js is CommonJS, so this is the same object.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const projectConfig = require('../../eslint.config.js') as Linter.Config[];

const lintAs = async (filePath: string, code: string) => {
  const eslint = new ESLint({
    cwd: projectRoot,
    overrideConfigFile: true,
    baseConfig: projectConfig,
  });
  const [result] = await eslint.lintText(code, { filePath: path.join(projectRoot, filePath) });
  return (result?.messages ?? []).filter((m) => m.ruleId === 'no-restricted-imports');
};

const RESTRICTED = [
  ['@supabase/supabase-js', 'createClient'],
  ['react-native-purchases', 'Purchases'],
  ['react-native-google-mobile-ads', 'mobileAds'],
  ['posthog-react-native', 'PostHog'],
  ['@sentry/react-native', 'Sentry'],
  ['expo-notifications', 'Notifications'],
] as const;

describe('SDK import boundary (SPEC §7)', () => {
  it.each(RESTRICTED)('rejects %s outside src/services', async (pkg, binding) => {
    const violations = await lintAs(
      'src/features/home/components/Probe.ts',
      `import ${binding} from '${pkg}';\nexport const probe = ${binding};\n`,
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]?.message).toMatch(/only inside src\/services/);
  });

  it.each(RESTRICTED)('allows %s inside src/services', async (pkg, binding) => {
    const violations = await lintAs(
      'src/services/probe/Probe.ts',
      `import ${binding} from '${pkg}';\nexport const probe = ${binding};\n`,
    );

    expect(violations).toEqual([]);
  });

  it('rejects a restricted import from a route file too', async () => {
    const violations = await lintAs(
      'src/app/(tabs)/index.tsx',
      `import Purchases from 'react-native-purchases';\nexport const probe = Purchases;\n`,
    );

    expect(violations).toHaveLength(1);
  });
});

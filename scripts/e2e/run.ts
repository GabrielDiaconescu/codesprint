import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { DEV_PASSWORD } from '../content/seed';
import { GENERATED_DIR, writeGenerated } from './generate';
import {
  APP_ID,
  METRO_PORT,
  ROOT,
  applyLocalSql,
  checkDevice,
  findMaestro,
  localPublishableKey,
  projectId,
  resetDatabase,
  reversePorts,
  run,
  runMaestro,
  startMetro,
  step,
  stopMetro,
} from './harness';

/**
 * `npm run e2e` — the Maestro suite against a development build (SPEC §53).
 *
 * One command, because every step below is one somebody forgets:
 *
 *   1. checks the device, the installed development build, Maestro and local Supabase;
 *   2. resets the LOCAL database and applies the E2E fixtures (skip with --no-reset);
 *   3. regenerates the content-derived subflows;
 *   4. starts its OWN Metro on METRO_PORT, pointed at local Supabase — never a Metro that is
 *      already running, which could be serving a bundle built against staging;
 *   5. runs the flows, writes a JUnit report to e2e/results/, and stops Metro again.
 *
 * Usage: npm run e2e [-- --no-reset] [-- e2e/flows/04-wrong-answers-and-lives.yaml]
 */

const RESULTS_DIR = join(ROOT, 'e2e', 'results');

const args = process.argv.slice(2);
const reset = !args.includes('--no-reset');
const target = args.find((arg) => !arg.startsWith('--')) ?? join('e2e', 'flows');

/**
 * Whether restore can be checked end to end here: it needs the local edge runtime to hold the
 * RevenueCat secret key, which only the RevenueCat dashboard has. Without it, restoring must
 * FAIL honestly, and that is what the flow is then told to expect.
 */
const restoreOutcome = (): 'nothing' | 'failed' => {
  const probe = run('docker', [
    'exec',
    `supabase_edge_runtime_${projectId()}`,
    'sh',
    '-c',
    'test -n "$REVENUECAT_SECRET_API_KEY"',
  ]);
  if (probe.status === 0) return 'nothing';

  console.warn(
    '  ! REVENUECAT_SECRET_API_KEY is not set for the local Edge Functions, so restore can ' +
      'only be checked to fail honestly. Set it in the shell before `npx supabase start` to ' +
      'check it end to end (docs/TESTING.md).',
  );
  return 'failed';
};

const main = async () => {
  step('Checking the device, Maestro and local Supabase');
  checkDevice();
  const maestro = findMaestro();
  const publishableKey = localPublishableKey();
  const restore = restoreOutcome();

  step('Generating subflows and fixtures from content/');
  writeGenerated();

  if (reset) resetDatabase();
  applyLocalSql(readFileSync(join(GENERATED_DIR, 'fixtures.sql'), 'utf8'), 'the E2E fixtures');

  reversePorts();
  const metro = await startMetro(publishableKey);
  // One run's artefacts at a time: screenshots from an older run read as this run's failures.
  rmSync(RESULTS_DIR, { recursive: true, force: true });
  mkdirSync(RESULTS_DIR, { recursive: true });

  let exitCode = 1;
  try {
    step(`Running ${target}`);
    exitCode = runMaestro(maestro, [
      'test',
      '--no-ansi',
      '-e',
      `APP_ID=${APP_ID}`,
      '-e',
      `METRO_PORT=${METRO_PORT}`,
      '-e',
      `DEV_PASSWORD=${DEV_PASSWORD}`,
      '-e',
      `RESTORE_OUTCOME=${restore}`,
      '--format',
      'junit',
      '--output',
      join(RESULTS_DIR, 'report.xml'),
      '--test-output-dir',
      join(RESULTS_DIR, 'artifacts'),
      target,
    ]);
  } finally {
    stopMetro(metro);
  }

  console.log(
    exitCode === 0 ? '\n✔ E2E suite passed' : `\n✖ E2E suite failed — artifacts in e2e/results/`,
  );
  process.exit(exitCode);
};

void main();

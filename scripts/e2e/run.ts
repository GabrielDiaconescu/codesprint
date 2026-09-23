import { spawn, spawnSync, type ChildProcess, type SpawnSyncReturns } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { DEV_PASSWORD } from '../content/seed';
import { GENERATED_DIR, writeGenerated } from './generate';

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

const ROOT = process.cwd();
const APP_ID = process.env.E2E_APP_ID ?? 'com.codesprint.app.dev';
const METRO_PORT = Number(process.env.E2E_METRO_PORT ?? 8082);
const SUPABASE_PORT = 54321;
const RESULTS_DIR = join(ROOT, 'e2e', 'results');
const isWindows = process.platform === 'win32';

const args = process.argv.slice(2);
const reset = !args.includes('--no-reset');
const target = args.find((arg) => !arg.startsWith('--')) ?? join('e2e', 'flows');

const fail = (message: string): never => {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
};

const step = (message: string) => console.log(`\n▸ ${message}`);

/**
 * Runs a command to completion. `.cmd`/`.bat` need a shell on Windows; nothing here is user
 * input. A timeout, because a wedged adb server does not fail — it waits forever.
 */
const run = (
  command: string,
  commandArgs: string[],
  { input, timeoutMs = 5 * 60_000 }: { input?: string; timeoutMs?: number } = {},
): SpawnSyncReturns<string> =>
  spawnSync(command, commandArgs, {
    encoding: 'utf8',
    input,
    shell: isWindows,
    timeout: timeoutMs,
  });

const npx = isWindows ? 'npx.cmd' : 'npx';

/** adb, with a short leash and a diagnosis when it does not answer. */
const adb = (adbArgs: string[]): string => {
  const result = run('adb', adbArgs, { timeoutMs: 30_000 });
  if (result.error && 'code' in result.error && result.error.code === 'ETIMEDOUT') {
    fail(
      `adb ${adbArgs.join(' ')} did not answer in 30 s. The adb server is wedged: stop every ` +
        'adb process (Task Manager, or `adb kill-server`) and run the suite again.',
    );
  }
  return result.stdout ?? '';
};

/* ------------------------------------------------------------------ preflight */

/**
 * A fresh adb server for every run. On Windows (platform-tools 37) a server that has been up
 * for a while — the emulator polls it every few seconds, and Maestro holds connections of its
 * own — wedges, and then every adb call waits forever. Seen mid-run more than once; a run of
 * twenty minutes on a server that starts fresh has not hit it. The port reverses go with the
 * old server and are set again before the flows start.
 */
const restartAdb = () => {
  run('adb', ['kill-server'], { timeoutMs: 15_000 });
  adb(['start-server']);
  const waited = run('adb', ['wait-for-device'], { timeoutMs: 90_000 });
  if (waited.status !== 0) {
    fail('The device did not come back after restarting adb. Is the emulator still running?');
  }
};

const checkDevice = () => {
  restartAdb();
  const devices = adb(['devices']);
  if (!/\tdevice$/m.test(devices)) {
    fail('No Android device or emulator is connected (adb devices). Start one first.');
  }
  const installed = adb(['shell', 'pm', 'path', APP_ID]);
  if (!installed.includes('package:')) {
    fail(
      `${APP_ID} is not installed. Install a development build first (README, "Running on a device").`,
    );
  }
};

/** Maestro from MAESTRO_BIN, PATH, or where its installers put it. */
const findMaestro = (): string => {
  const candidates = [
    process.env.MAESTRO_BIN,
    join(homedir(), '.maestro', 'bin', 'maestro'),
    join(homedir(), '.maestro', 'maestro', 'bin', 'maestro.bat'),
  ].filter((path): path is string => Boolean(path));

  const found = candidates.find((path) => existsSync(path));
  if (found) return found;
  if (run(isWindows ? 'where' : 'which', ['maestro']).status === 0) return 'maestro';

  return fail('Maestro is not installed. See docs/TESTING.md, "E2E".');
};

/** The local publishable key, read from the CLI rather than .env, which may point at staging. */
const localPublishableKey = (): string => {
  const status = run(npx, ['supabase', 'status', '-o', 'env']);
  if (status.status !== 0)
    fail('Local Supabase is not running. Start Docker, then: npx supabase start');

  // Only this one line is read; the same output holds the local secret keys.
  const line = (status.stdout ?? '').split(/\r?\n/).find((l) => l.startsWith('PUBLISHABLE_KEY='));
  const key = line?.slice('PUBLISHABLE_KEY='.length).replace(/^"|"$/g, '');
  return key || fail('Could not read the local publishable key from `supabase status`.');
};

const projectId = (): string => {
  const config = readFileSync(join(ROOT, 'supabase', 'config.toml'), 'utf8');
  const match = /^project_id\s*=\s*"([^"]+)"/m.exec(config);
  return match?.[1] ?? fail('No project_id in supabase/config.toml');
};

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

/* ------------------------------------------------------------------ database */

const prepareDatabase = () => {
  if (reset) {
    step('Resetting the local database (migrations + seed)');
    const result = run(npx, ['supabase', 'db', 'reset']);
    if (result.status !== 0) fail(`supabase db reset failed:\n${result.stderr}`);
  }

  step('Applying the E2E fixtures');
  const sql = readFileSync(join(GENERATED_DIR, 'fixtures.sql'), 'utf8');
  const result = run(
    'docker',
    [
      'exec',
      '-i',
      `supabase_db_${projectId()}`,
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-q',
    ],
    { input: sql },
  );
  if (result.status !== 0) fail(`The fixtures did not apply:\n${result.stderr}`);
};

/* ------------------------------------------------------------------ metro */

const metroStatus = async (): Promise<boolean> => {
  try {
    const response = await fetch(`http://127.0.0.1:${METRO_PORT}/status`);
    return (await response.text()).includes('packager-status:running');
  } catch {
    return false;
  }
};

const startMetro = async (publishableKey: string): Promise<ChildProcess> => {
  if (await metroStatus()) {
    fail(
      `Something is already serving on port ${METRO_PORT}. Stop it, or set E2E_METRO_PORT: ` +
        'the suite must run against a bundle it built itself, against local Supabase.',
    );
  }

  step(`Starting Metro on port ${METRO_PORT} against local Supabase`);
  const metro = spawn(npx, ['expo', 'start', '--dev-client', '--port', String(METRO_PORT)], {
    env: {
      ...process.env,
      // Real environment variables win over .env, so these cannot be overridden by it.
      EXPO_PUBLIC_APP_ENV: 'development',
      EXPO_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${SUPABASE_PORT}`,
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      CI: '1',
    },
    shell: isWindows,
    detached: !isWindows,
    stdio: 'ignore',
  });

  for (let waited = 0; waited < 180; waited += 2) {
    if (await metroStatus()) return metro;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  stopMetro(metro);
  return fail('Metro did not start within three minutes.');
};

const stopMetro = (metro: ChildProcess) => {
  if (metro.pid === undefined) return;
  if (isWindows) {
    run('taskkill', ['/pid', String(metro.pid), '/T', '/F']);
  } else {
    try {
      process.kill(-metro.pid, 'SIGTERM');
    } catch {
      // Already gone.
    }
  }
};

/* ------------------------------------------------------------------ main */

const main = async () => {
  step('Checking the device, Maestro and local Supabase');
  checkDevice();
  const maestro = findMaestro();
  const publishableKey = localPublishableKey();
  const restore = restoreOutcome();

  step('Generating subflows and fixtures from content/');
  writeGenerated();

  prepareDatabase();

  // The device reaches Metro and the local API through the host's loopback.
  for (const port of [METRO_PORT, SUPABASE_PORT]) {
    adb(['reverse', `tcp:${port}`, `tcp:${port}`]);
  }

  const metro = await startMetro(publishableKey);
  // One run's artefacts at a time: screenshots from an older run read as this run's failures.
  rmSync(RESULTS_DIR, { recursive: true, force: true });
  mkdirSync(RESULTS_DIR, { recursive: true });

  let exitCode = 1;
  try {
    step(`Running ${target}`);
    const result = spawnSync(
      maestro,
      [
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
      ],
      {
        stdio: 'inherit',
        shell: isWindows,
        env: {
          ...process.env,
          MAESTRO_CLI_NO_ANALYTICS: '1',
          MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true',
        },
      },
    );
    exitCode = result.status ?? 1;
  } finally {
    stopMetro(metro);
  }

  console.log(
    exitCode === 0 ? '\n✔ E2E suite passed' : `\n✖ E2E suite failed — artifacts in e2e/results/`,
  );
  process.exit(exitCode);
};

void main();

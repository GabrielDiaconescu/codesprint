import { spawn, spawnSync, type ChildProcess, type SpawnSyncReturns } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * What a run on a device needs around Maestro: adb, the local database, and a Metro of its own
 * pointed at local Supabase. Shared by the E2E suite (`npm run e2e`) and the store screenshots
 * (`npm run store:screenshots`), which drive the same development build the same way.
 */

export const ROOT = process.cwd();
export const APP_ID = process.env.E2E_APP_ID ?? 'com.codesprint.app.dev';
export const METRO_PORT = Number(process.env.E2E_METRO_PORT ?? 8082);
export const SUPABASE_PORT = 54321;
export const isWindows = process.platform === 'win32';
export const npx = isWindows ? 'npx.cmd' : 'npx';

export const fail = (message: string): never => {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
};

export const step = (message: string) => console.log(`\n▸ ${message}`);

/**
 * Runs a command to completion. `.cmd`/`.bat` need a shell on Windows; nothing here is user
 * input. A timeout, because a wedged adb server does not fail — it waits forever.
 */
export const run = (
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

/** adb, with a short leash and a diagnosis when it does not answer. */
export const adb = (adbArgs: string[]): string => {
  const result = run('adb', adbArgs, { timeoutMs: 30_000 });
  if (result.error && 'code' in result.error && result.error.code === 'ETIMEDOUT') {
    fail(
      `adb ${adbArgs.join(' ')} did not answer in 30 s. The adb server is wedged: stop every ` +
        'adb process (Task Manager, or `adb kill-server`) and run again.',
    );
  }
  return result.stdout ?? '';
};

/* ------------------------------------------------------------------ device */

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

export const checkDevice = () => {
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

  // A freshly installed debug build is not compiled ahead of time, and its first cold starts
  // verify bytecode slowly enough on an emulator for Android to kill it as not responding.
  // Compiling now is a no-op once done, and saves a run of nine identical launch failures.
  // Its own, longer timeout: the first compile of a 280 MB debug build takes a minute or more.
  step(`Compiling ${APP_ID} ahead of time (instant once done)`);
  run('adb', ['shell', 'cmd', 'package', 'compile', '-m', 'speed', APP_ID], {
    timeoutMs: 5 * 60_000,
  });
};

/** The device reaches Metro and the local API through the host's loopback. */
export const reversePorts = () => {
  for (const port of [METRO_PORT, SUPABASE_PORT]) {
    adb(['reverse', `tcp:${port}`, `tcp:${port}`]);
  }
};

/** Maestro from MAESTRO_BIN, PATH, or where its installers put it. */
export const findMaestro = (): string => {
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

/** Runs Maestro in the foreground and returns its exit code. */
export const runMaestro = (maestro: string, maestroArgs: string[]): number => {
  const result = spawnSync(maestro, maestroArgs, {
    stdio: 'inherit',
    shell: isWindows,
    env: {
      ...process.env,
      MAESTRO_CLI_NO_ANALYTICS: '1',
      MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true',
    },
  });
  return result.status ?? 1;
};

/* ------------------------------------------------------------------ database */

/** The local publishable key, read from the CLI rather than .env, which may point at staging. */
export const localPublishableKey = (): string => {
  const status = run(npx, ['supabase', 'status', '-o', 'env']);
  if (status.status !== 0)
    fail('Local Supabase is not running. Start Docker, then: npx supabase start');

  // Only this one line is read; the same output holds the local secret keys.
  const line = (status.stdout ?? '').split(/\r?\n/).find((l) => l.startsWith('PUBLISHABLE_KEY='));
  const key = line?.slice('PUBLISHABLE_KEY='.length).replace(/^"|"$/g, '');
  return key || fail('Could not read the local publishable key from `supabase status`.');
};

export const projectId = (): string => {
  const config = readFileSync(join(ROOT, 'supabase', 'config.toml'), 'utf8');
  const match = /^project_id\s*=\s*"([^"]+)"/m.exec(config);
  return match?.[1] ?? fail('No project_id in supabase/config.toml');
};

/**
 * The local Edge Functions run in a container of their own, which `supabase start` does not bring
 * back when it stopped while the rest of the stack stayed up — after a Docker restart, say. Without
 * it, deleting an account fails at the very end of its flow, and restore looks like a missing key.
 */
export const checkEdgeFunctions = () => {
  const container = `supabase_edge_runtime_${projectId()}`;
  const state = run('docker', ['inspect', '--format', '{{.State.Running}}', container]);
  if ((state.stdout ?? '').trim() !== 'true') {
    fail(
      `The local Edge Functions are not running (${container}). Restart the local stack: ` +
        'npx supabase stop, then npx supabase start',
    );
  }
};

export const resetDatabase = () => {
  step('Resetting the local database (migrations + seed)');
  const result = run(npx, ['supabase', 'db', 'reset']);
  if (result.status !== 0) fail(`supabase db reset failed:\n${result.stderr}`);
};

/**
 * Applies SQL to the LOCAL database, through `docker exec` into the local Supabase container —
 * the only database this can reach.
 */
export const applyLocalSql = (sql: string, what: string) => {
  step(`Applying ${what}`);
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
  if (result.status !== 0) fail(`${what} did not apply:\n${result.stderr}`);
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

export const stopMetro = (metro: ChildProcess) => {
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

export const startMetro = async (publishableKey: string): Promise<ChildProcess> => {
  if (await metroStatus()) {
    fail(
      `Something is already serving on port ${METRO_PORT}. Stop it, or set E2E_METRO_PORT: ` +
        'the run must use a bundle it built itself, against local Supabase.',
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
      // The app keeps dev error toasts off screen while a run drives it (src/lib/env.ts).
      EXPO_PUBLIC_AUTOMATION: '1',
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

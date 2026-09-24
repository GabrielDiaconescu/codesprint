import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildFromDisk } from '../content/build';
import { EnvValidationError, parseEnv } from '../../src/lib/env';

/**
 * `npm run release:check` — what still stands between this repository and a store build
 * (Phase 22, SPEC §51, §54).
 *
 * Every blocker it reports is something a production build would otherwise discover the hard
 * way: an app that refuses to start (the env schema), test ads in a store build, a privacy page
 * with "[SUPPORT EMAIL]" in it, lessons that will never reach production because nobody
 * reviewed them. It reads the EAS **production** environment through the EAS CLI — the same
 * variables a production build receives — and validates them with the app's own schema, so
 * the rules live in one place.
 *
 * Nothing here prints a variable's value.
 */

export interface Finding {
  level: 'blocker' | 'warning';
  area: string;
  message: string;
}

/** Google's published TEST AdMob publisher: never in a store build (SPEC §59.31). */
const ADMOB_TEST_PUBLISHER = 'ca-app-pub-3940256099942544';
/** The hosted staging project; a production build must not point at it. */
const STAGING_PROJECT_REF = 'uzmqmmvpunkxogvtbypl';

/**
 * `eas env:list <env> --format short` → { NAME: value }. Sensitive and secret variables arrive
 * as `*****…`: present, but not readable here (see `isMasked`).
 */
export const parseEnvList = (output: string): Record<string, string> => {
  const vars: Record<string, string> = {};
  for (const line of output.split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (match) vars[match[1]!] = match[2]!;
  }
  return vars;
};

/** A sensitive or secret EAS variable: it exists, and its value is not ours to read. */
export const isMasked = (value: string): boolean => value.startsWith('*****');

/**
 * Some of the app's own schema messages quote the value they rejected, which is right on a
 * developer's screen and wrong in a report meant to be pasted into a chat or an issue.
 */
const redact = (message: string, vars: Record<string, string>): string =>
  Object.values(vars)
    .filter((value) => value.length >= 4)
    .reduce((text, value) => text.split(value).join('<value>'), message);

/** Build-time variables for Sentry's upload step; without them a production build fails. */
const SENTRY_BUILD_VARS = ['SENTRY_AUTH_TOKEN', 'SENTRY_ORG', 'SENTRY_PROJECT'];

export const productionEnvFindings = (vars: Record<string, string>): Finding[] => {
  const findings: Finding[] = [];
  const area = 'EAS production environment';

  // An EXPO_PUBLIC_ value is compiled into the app for anyone to read: hiding it in EAS buys
  // nothing and stops this check from validating it.
  const masked = Object.keys(vars).filter(
    (name) => name.startsWith('EXPO_PUBLIC_') && isMasked(vars[name]!),
  );
  for (const name of masked) {
    findings.push({
      level: 'warning',
      area,
      message: `${name} is sensitive or secret, so it cannot be checked — it is public by design; make it plain text`,
    });
  }

  try {
    parseEnv({ ...vars, EXPO_PUBLIC_APP_ENV: 'production' });
  } catch (error) {
    if (!(error instanceof EnvValidationError)) throw error;
    const unreadable = (issue: string) => masked.some((name) => issue.startsWith(`${name}:`));
    for (const issue of error.issues.filter((i) => !unreadable(i))) {
      findings.push({
        level: 'blocker',
        area,
        message: `the app would refuse to start: ${redact(issue, vars)}`,
      });
    }
  }

  for (const name of ['ADMOB_APP_ID_ANDROID', 'ADMOB_APP_ID_IOS']) {
    if (!vars[name]) {
      findings.push({
        level: 'blocker',
        area,
        message: `${name} is not set — the build would embed Google's TEST app id`,
      });
    }
  }

  for (const [name, value] of Object.entries(vars)) {
    if (name.includes('ADMOB') && value.includes(ADMOB_TEST_PUBLISHER)) {
      findings.push({ level: 'blocker', area, message: `${name} is a Google TEST id` });
    }
  }

  if ((vars.EXPO_PUBLIC_SUPABASE_URL ?? '').includes(STAGING_PROJECT_REF)) {
    findings.push({
      level: 'blocker',
      area,
      message: 'EXPO_PUBLIC_SUPABASE_URL points at STAGING, not the production project',
    });
  }

  if (!vars.EXPO_PUBLIC_SENTRY_DSN) {
    findings.push({
      level: 'blocker',
      area,
      message:
        'EXPO_PUBLIC_SENTRY_DSN is not set — crashes in production would be reported nowhere',
    });
  }

  for (const name of SENTRY_BUILD_VARS.filter((n) => !vars[n])) {
    findings.push({
      level: 'blocker',
      area,
      message: `${name} is not set — the build fails when it uploads source maps to Sentry`,
    });
  }

  if (vars.SENTRY_DISABLE_AUTO_UPLOAD === 'true') {
    findings.push({
      level: 'blocker',
      area,
      message: 'SENTRY_DISABLE_AUTO_UPLOAD is on — production crashes would arrive unreadable',
    });
  }

  return findings;
};

/** `[LIKE THIS]` markers left in the static pages — each one is text a lawyer or you must supply. */
export const webPlaceholderFindings = (files: Record<string, string>): Finding[] =>
  Object.entries(files).flatMap(([name, html]) => {
    const count = (html.match(/class="placeholder"/g) ?? []).length;
    return count > 0
      ? [
          {
            level: 'blocker' as const,
            area: 'Legal pages (web/)',
            message: `${name}: ${count} placeholder${count === 1 ? '' : 's'} still to fill`,
          },
        ]
      : [];
  });

export const appAdsFindings = (appAdsTxt: string): Finding[] =>
  /pub-0{16}/.test(appAdsTxt)
    ? [
        {
          level: 'blocker',
          area: 'web/app-ads.txt',
          message: 'still the placeholder publisher id — put the real AdMob publisher id in',
        },
      ]
    : [];

/** Counts of `review_status: draft` against the totals, for lessons and for questions. */
export interface DraftCounts {
  lessons: { drafts: number; total: number };
  questions: { drafts: number; total: number };
}

export const contentFindings = ({ lessons, questions }: DraftCounts): Finding[] =>
  lessons.drafts + questions.drafts > 0
    ? [
        {
          level: 'warning',
          area: 'Content',
          message:
            `${lessons.drafts} of ${lessons.total} lessons and ${questions.drafts} of ` +
            `${questions.total} questions are still drafts — \`content:publish --production\` ` +
            'leaves them out (SPEC §35.3)',
        },
      ]
    : [];

/* ------------------------------------------------------------------ main */

const readWebPages = (): Record<string, string> => {
  const dir = join(process.cwd(), 'web');
  return Object.fromEntries(
    readdirSync(dir)
      .filter((name) => name.endsWith('.html') && name !== 'licenses.html')
      .map((name) => [`web/${name}`, readFileSync(join(dir, name), 'utf8')]),
  );
};

/**
 * The production environment as EAS holds it. Plain and sensitive values come back (sensitive
 * ones only to check they are present); secret ones do not come back at all, and none of the
 * public variables the app needs is a secret.
 */
const readProductionEnv = (): Record<string, string> | Finding => {
  try {
    return parseEnvList(
      execSync('npx eas-cli env:list production --format short', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }),
    );
  } catch {
    return {
      level: 'blocker',
      area: 'EAS production environment',
      message: 'could not be read — are you logged in? (npx eas-cli login)',
    };
  }
};

const draftCounts = (): DraftCounts => {
  const rows = buildFromDisk();
  const count = (items: { review_status: string }[]) => ({
    drafts: items.filter((item) => item.review_status !== 'reviewed').length,
    total: items.length,
  });
  return { lessons: count(rows.lessons), questions: count(rows.questions) };
};

const main = () => {
  const env = readProductionEnv();

  const findings = [
    ...('level' in env ? [env] : productionEnvFindings(env)),
    ...webPlaceholderFindings(readWebPages()),
    ...appAdsFindings(readFileSync(join(process.cwd(), 'web', 'app-ads.txt'), 'utf8')),
    ...contentFindings(draftCounts()),
  ];

  const blockers = findings.filter((f) => f.level === 'blocker');
  const warnings = findings.filter((f) => f.level === 'warning');

  for (const [title, list] of [
    ['Blockers', blockers],
    ['Warnings', warnings],
  ] as const) {
    if (list.length === 0) continue;
    console.log(`\n${title}:`);
    for (const finding of list) console.log(`  • [${finding.area}] ${finding.message}`);
  }

  console.log(
    blockers.length === 0
      ? '\n✔ Nothing blocks a production build.'
      : `\n✖ ${blockers.length} blocker${blockers.length === 1 ? '' : 's'} before a production build. See docs/DEPLOYMENT.md.`,
  );
  process.exit(blockers.length === 0 ? 0 : 1);
};

if (/release[\\/]check/.test(process.argv[1] ?? '')) main();

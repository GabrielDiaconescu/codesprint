import {
  appAdsFindings,
  contentFindings,
  parseEnvList,
  productionEnvFindings,
  webPlaceholderFindings,
} from '../check';

/**
 * The release readiness check (Phase 22): what it reports is what would otherwise be found by
 * a store build that does not start, serves test ads, or ships a page full of placeholders.
 */

/** A production environment with nothing missing. Shapes only — none of these is real. */
const complete: Record<string, string> = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://prodprojectref0000000.supabase.co',
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
  EXPO_PUBLIC_REVENUECAT_IOS_KEY: 'appl_example',
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: 'goog_example',
  EXPO_PUBLIC_ADMOB_BANNER_ID_IOS: 'ca-app-pub-1111111111111111/1111111111',
  EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID: 'ca-app-pub-1111111111111111/2222222222',
  EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_IOS: 'ca-app-pub-1111111111111111/3333333333',
  EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_ANDROID: 'ca-app-pub-1111111111111111/4444444444',
  EXPO_PUBLIC_ADMOB_REWARDED_ID_IOS: 'ca-app-pub-1111111111111111/5555555555',
  EXPO_PUBLIC_ADMOB_REWARDED_ID_ANDROID: 'ca-app-pub-1111111111111111/6666666666',
  EXPO_PUBLIC_POSTHOG_KEY: 'phc_example',
  EXPO_PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com',
  EXPO_PUBLIC_SENTRY_DSN: 'https://abc@o1.ingest.de.sentry.io/1',
  EXPO_PUBLIC_LEGAL_BASE_URL: 'https://codesprint.example',
  ADMOB_APP_ID_ANDROID: 'ca-app-pub-1111111111111111~1111111111',
  ADMOB_APP_ID_IOS: 'ca-app-pub-1111111111111111~2222222222',
  SENTRY_AUTH_TOKEN: '***** (This is a secret env variable)',
  SENTRY_ORG: 'codesprint',
  SENTRY_PROJECT: 'codesprint-app',
};

describe('parseEnvList', () => {
  it('reads the variables out of `eas env:list --format short`', () => {
    const output = 'Environment: production\r\nFOO_BAR=1\nEXPO_PUBLIC_X=a=b\n\n';

    expect(parseEnvList(output)).toEqual({ FOO_BAR: '1', EXPO_PUBLIC_X: 'a=b' });
  });
});

describe('productionEnvFindings', () => {
  it('finds nothing wrong with a complete production environment', () => {
    expect(productionEnvFindings(complete)).toEqual([]);
  });

  it('blocks on every variable the app would refuse to start without', () => {
    const { EXPO_PUBLIC_POSTHOG_KEY: _missing, ...rest } = complete;

    const findings = productionEnvFindings(rest);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ level: 'blocker' });
    expect(findings[0]?.message).toContain('EXPO_PUBLIC_POSTHOG_KEY');
  });

  it("blocks when the AdMob app id would fall back to Google's test app", () => {
    const { ADMOB_APP_ID_IOS: _missing, ...rest } = complete;

    expect(productionEnvFindings(rest).map((f) => f.message)).toEqual([
      expect.stringContaining('ADMOB_APP_ID_IOS is not set'),
    ]);
  });

  it('blocks on Google test ids left in place (SPEC §59.31)', () => {
    const findings = productionEnvFindings({
      ...complete,
      ADMOB_APP_ID_ANDROID: 'ca-app-pub-3940256099942544~3347511713',
    });

    expect(findings.map((f) => f.message)).toEqual([
      expect.stringContaining('ADMOB_APP_ID_ANDROID is a Google TEST id'),
    ]);
  });

  it('blocks a production build pointed at the staging database', () => {
    const findings = productionEnvFindings({
      ...complete,
      EXPO_PUBLIC_SUPABASE_URL: 'https://uzmqmmvpunkxogvtbypl.supabase.co',
    });

    expect(findings.map((f) => f.message)).toEqual([expect.stringContaining('STAGING')]);
  });

  it('blocks when crashes would go unreported, or arrive unreadable (SPEC §44)', () => {
    const { EXPO_PUBLIC_SENTRY_DSN: _dsn, SENTRY_AUTH_TOKEN: _token, ...rest } = complete;

    expect(productionEnvFindings(rest).map((f) => f.message)).toEqual([
      expect.stringContaining('EXPO_PUBLIC_SENTRY_DSN is not set'),
      expect.stringContaining('SENTRY_AUTH_TOKEN is not set'),
    ]);
    expect(productionEnvFindings({ ...complete, SENTRY_DISABLE_AUTO_UPLOAD: 'true' })).toHaveLength(
      1,
    );
  });

  it('accepts a secret it cannot read, and asks for public values to be readable', () => {
    const findings = productionEnvFindings({
      ...complete,
      EXPO_PUBLIC_POSTHOG_HOST: '***** (This is a sensitive env variable.)',
    });

    expect(findings).toEqual([
      expect.objectContaining({
        level: 'warning',
        message: expect.stringContaining('EXPO_PUBLIC_POSTHOG_HOST is sensitive or secret'),
      }),
    ]);
  });

  it('never repeats a value in what it reports', () => {
    const findings = productionEnvFindings({
      ...complete,
      EXPO_PUBLIC_POSTHOG_HOST: 'not-a-url-secretish',
    });

    expect(JSON.stringify(findings)).not.toContain('secretish');
  });
});

describe('webPlaceholderFindings', () => {
  it('counts the placeholders left in each page', () => {
    const findings = webPlaceholderFindings({
      'web/privacy.html':
        '<span class="placeholder">[A]</span> <span class="placeholder">[B]</span>',
      'web/terms.html': '<p>Done.</p>',
    });

    expect(findings).toEqual([
      expect.objectContaining({
        level: 'blocker',
        message: 'web/privacy.html: 2 placeholders still to fill',
      }),
    ]);
  });
});

describe('appAdsFindings', () => {
  it('blocks on the placeholder publisher id', () => {
    expect(
      appAdsFindings('google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0'),
    ).toHaveLength(1);
    expect(appAdsFindings('google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0')).toEqual(
      [],
    );
  });
});

describe('contentFindings', () => {
  it('warns while anything is still a draft', () => {
    const findings = contentFindings({
      lessons: { drafts: 0, total: 10 },
      questions: { drafts: 3, total: 50 },
    });

    expect(findings).toEqual([expect.objectContaining({ level: 'warning' })]);
    expect(findings[0]?.message).toContain('3 of 50 questions');
  });

  it('is quiet once everything is reviewed', () => {
    expect(
      contentFindings({ lessons: { drafts: 0, total: 10 }, questions: { drafts: 0, total: 50 } }),
    ).toEqual([]);
  });
});

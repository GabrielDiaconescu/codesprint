/**
 * Where the static legal and support pages live (SPEC §29, §33, §41; `web/`), in the learner's
 * language: Romanian pages under `/ro/`, English at the root. The licences page is generated in
 * English only.
 *
 * `null` without a base URL — the pages are not hosted yet in that environment — so that no
 * screen can ever offer a link to "undefined/terms.html", which the paywall once did. A
 * production build cannot start without the URL (src/lib/env.ts), so there this never happens.
 */
export interface LegalUrls {
  privacy: string;
  terms: string;
  support: string;
  deleteAccount: string;
  licenses: string;
}

export const legalUrls = (base: string | undefined, language = 'en'): LegalUrls | null => {
  const root = base?.trim().replace(/\/+$/, '');
  if (!root) return null;

  const pages = language.toLowerCase().startsWith('ro') ? `${root}/ro` : root;
  return {
    privacy: `${pages}/privacy.html`,
    terms: `${pages}/terms.html`,
    support: `${pages}/`,
    deleteAccount: `${pages}/delete-account.html`,
    licenses: `${root}/licenses.html`,
  };
};

/** Today's export gets today's name, in the learner's own calendar. */
export const exportFileName = (now: Date): string => {
  const pad = (value: number) => String(value).padStart(2, '0');
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `codesprint-data-${day}.json`;
};

/**
 * Plural rules for an engine that has none (SPEC §38).
 *
 * Hermes ships `Intl` without `Intl.PluralRules`. i18next then falls back to its own rule —
 * `one` for 1, `other` for everything else — which is exactly English and wrong for Romanian:
 * the phone said "3 de întrebări" and "0 de zile" where Romanian says "3 întrebări" and
 * "0 zile", because the `few` form was never chosen. Jest runs on Node, whose `Intl` is
 * complete, so no test saw it.
 *
 * `polyfill.js` installs itself only where the engine's own rules are missing or incomplete,
 * so it costs nothing where they are not. Locale data is loaded for the locales we ship and no
 * others; a new locale needs its line here, and `pluralRules.test.ts` fails until it has one.
 *
 * Imported for its side effect before i18next is initialised: i18next caches a rule per
 * language the first time it pluralises, and a rule cached before this ran would stay wrong.
 */
import '@formatjs/intl-pluralrules/polyfill.js';
import '@formatjs/intl-pluralrules/locale-data/en.js';
import '@formatjs/intl-pluralrules/locale-data/ro.js';

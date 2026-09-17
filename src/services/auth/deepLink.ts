/**
 * Auth deep-link parsing (SPEC §12, §40).
 *
 * Every parameter here arrives from outside the app: any installed application can fire our
 * scheme with arbitrary content. SPEC §40 requires validating deep-link parameters, so this
 * parser assumes nothing — it hand-parses rather than relying on `URL`, whose behaviour for
 * custom schemes differs between Hermes, the URL polyfill and Node, and it returns a closed
 * union so a caller cannot forget a case.
 *
 * The `flow` parameter is ours, round-tripped through `redirectTo`. Supabase does not tell us
 * whether a code came from a signup confirmation or a password reset, and the two have to end
 * on different screens — a recovery link must land on "choose a new password", never silently
 * sign the user in.
 */

export type AuthLinkFlow = 'recovery' | 'signup' | 'unknown';

export type ParsedAuthLink =
  | { kind: 'none' }
  | { kind: 'code'; flow: AuthLinkFlow; code: string }
  | { kind: 'error'; errorCode: string };

/** Auth codes are opaque, but they are always URL-safe and bounded; anything else is junk. */
const CODE_PATTERN = /^[A-Za-z0-9._~-]{8,512}$/;

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
};

/**
 * Collects parameters from BOTH the query string and the fragment. Supabase uses the query
 * for the PKCE code flow and the fragment for implicit-flow errors, and which one arrives
 * depends on where the failure happened, not on how we configured the client.
 */
const collectParams = (url: string): Map<string, string> => {
  const params = new Map<string, string>();

  for (const separator of ['?', '#']) {
    const start = url.indexOf(separator);
    if (start === -1) continue;

    // Stop at the other separator so a query is not swallowed by the fragment scan.
    const rest = url.slice(start + 1);
    const end = separator === '?' ? rest.indexOf('#') : -1;
    const segment = end === -1 ? rest : rest.slice(0, end);

    for (const pair of segment.split('&')) {
      if (!pair) continue;
      const eq = pair.indexOf('=');
      const rawKey = eq === -1 ? pair : pair.slice(0, eq);
      const rawValue = eq === -1 ? '' : pair.slice(eq + 1);
      const key = safeDecode(rawKey);
      // First occurrence wins: a second `code=` appended by an attacker must not override
      // the one the provider sent.
      if (key && !params.has(key)) params.set(key, safeDecode(rawValue));
    }
  }

  return params;
};

const toFlow = (value: string | undefined): AuthLinkFlow =>
  value === 'recovery' || value === 'signup' ? value : 'unknown';

/** The shared decision, once parameters exist — whatever they were extracted from. */
const interpret = (get: (key: string) => string | undefined): ParsedAuthLink => {
  // Errors are checked first: a link can carry both an error and a stale code, and acting on
  // the code would turn a rejected link into a successful sign-in.
  const errorCode = get('error_code') ?? get('error');
  if (errorCode) return { kind: 'error', errorCode };

  const code = get('code');
  if (code && CODE_PATTERN.test(code)) {
    return { kind: 'code', flow: toFlow(get('flow')), code };
  }

  // An implicit-flow token pair means the provider is not configured for PKCE. We cannot use
  // it, and treating it as success would strand the user in a half-signed-in state.
  if (get('access_token')) return { kind: 'error', errorCode: 'unsupported_flow' };

  return { kind: 'none' };
};

export const parseAuthLink = (url: string): ParsedAuthLink => {
  if (typeof url !== 'string' || url.length === 0) return { kind: 'none' };

  const params = collectParams(url);
  return interpret((key) => params.get(key));
};

/**
 * The same decision for parameters the router already extracted.
 *
 * Expo Router hands a route its search params as strings — or as an array when a key repeats.
 * A repeated key is exactly the tampering case `collectParams` guards against, so the first
 * entry wins here too.
 */
export type RouteParams = Record<string, string | string[] | undefined>;

export const interpretAuthParams = (params: RouteParams): ParsedAuthLink => {
  if (params === null || typeof params !== 'object') return { kind: 'none' };

  return interpret((key) => {
    const value = params[key];
    if (Array.isArray(value)) return value[0];
    return typeof value === 'string' ? value : undefined;
  });
};

// Confirms EMAIL the way its owner would, and hands back the link that opens the app.
//
// Local Supabase delivers auth email to Mailpit (supabase/config.toml, [inbucket]). This reads
// the newest message to EMAIL, follows its verify link FROM THE HOST — which is what confirms
// the address — and returns the redirect Supabase answers with: the app's own
// `codesprint-dev://auth-callback?code=...`, for the flow to open on the device. Following it
// on the device would mean scripting a browser's first-run screens instead.
//
// Runs inside Maestro's JavaScript engine: `http`, `json` and `output` are Maestro's.

const MAILPIT = 'http://127.0.0.1:54324';

const query = encodeURIComponent('to:"' + EMAIL + '"');
const found = json(http.get(MAILPIT + '/api/v1/search?limit=1&query=' + query).body);
if (!found.messages || found.messages.length === 0) {
  throw new Error('no email to ' + EMAIL + ' in Mailpit');
}

const message = json(http.get(MAILPIT + '/api/v1/message/' + found.messages[0].ID).body);
const body = (message.Text || '') + '\n' + (message.HTML || '');
const match = /https?:\/\/[^\s"'<>]+\/auth\/v1\/verify\?[^\s"'<>]+/.exec(body);
if (!match) {
  throw new Error('the email to ' + EMAIL + ' has no verify link');
}

const verified = http.get(match[0].replace(/&amp;/g, '&'));
const headers = verified.headers || {};
const appLink = headers.location || headers.Location;
if (!appLink || appLink.indexOf('codesprint-dev://') !== 0) {
  throw new Error('verify did not redirect to the app (status ' + verified.status + ')');
}

output.appLink = appLink;

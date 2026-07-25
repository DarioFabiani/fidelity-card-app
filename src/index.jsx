import { render } from 'preact';
import { App } from './app';
import './app.css';

/*
 * preact-router runs decodeURIComponent over the query string, which throws on
 * a malformed percent escape ("?data=abc%def"). That happens for real: chat
 * apps and mail clients mangle long links. The throw happened during render,
 * leaving a page with only the header and no way out — not even the router
 * could recover, since every navigation re-parsed the same bad string.
 *
 * Stripping the broken escapes before the app mounts turns it into an ordinary
 * invalid link, which the shared-card page already explains.
 */
function sanitizeMalformedQuery() {
  const { search } = window.location;
  if (!search) return;
  try {
    decodeURIComponent(search);
  } catch {
    // Escape every '%' so the string decodes to itself. Dropping only the
    // syntactically broken ones is not enough: "%de" is well-formed as an
    // escape but is not valid UTF-8, and still throws.
    const cleaned = search.replace(/%/g, '%25');
    window.history.replaceState(null, '', window.location.pathname + cleaned + window.location.hash);
  }
}

sanitizeMalformedQuery();

render(<App />, document.getElementById('app'));

/*
 * The service worker updates itself (registerType: 'autoUpdate'), which means
 * a tab left open across a deploy keeps running the old build while the new
 * one takes over the cache. Any chunk that tab has not loaded yet — the
 * barcode renderer, the scanner — is then gone: its hashed filename is no
 * longer on the server and the old precache has been cleaned up.
 *
 * Reloading once, when the new worker takes control, puts the tab back on a
 * consistent build. The guard is there because controllerchange also fires the
 * first time a worker claims the page, and reloading in a loop would be worse
 * than the problem.
 */
if ('serviceWorker' in navigator) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}

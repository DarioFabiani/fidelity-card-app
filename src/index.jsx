import { render } from 'preact';
import { App } from './app';
import './app.css';
import { initServiceWorker } from './utils/pwa';

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
 * The service worker used to update itself and reload the tab on its own
 * (registerType 'autoUpdate'). That kept the tab on a consistent build, but
 * the reload could land at any moment: in the middle of showing a barcode at
 * the till, over a half-filled form, or — with encryption on — dropping the
 * key and asking for the password right there.
 *
 * Now a new build waits (registerType 'prompt'): the old worker keeps serving
 * the old build's files, so lazily loaded chunks stay reachable, and the app
 * offers "Aggiorna" instead. The new build also takes over by itself the next
 * time every window of the app is closed.
 */
initServiceWorker();

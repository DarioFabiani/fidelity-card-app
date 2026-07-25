import { render } from 'preact';
import { App } from './app';
import './app.css';

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

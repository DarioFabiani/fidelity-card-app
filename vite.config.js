import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'));

/**
 * GitHub Pages has no SPA fallback: a deep link like /shared?data=... is
 * requested from the server before the app exists in the browser, and answers
 * 404. That is exactly the path a shared card arrives on, for a recipient who
 * has never opened the app — so the service worker cannot help either.
 * Serving the same document as 404.html makes Pages hand back the app, which
 * then routes client-side.
 */
function spaFallback() {
  return {
    name: 'spa-fallback-404',
    closeBundle() {
      const dist = resolve(__dirname, 'dist');
      const index = resolve(dist, 'index.html');
      if (existsSync(index)) {
        copyFileSync(index, resolve(dist, '404.html'));
      }
    }
  };
}

export default defineConfig({
  base: '/fidelity-card-app/',
  define: {
    // Shown in Settings, so it always matches the build actually running.
    __APP_VERSION__: JSON.stringify(version)
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    testTimeout: 30000
  },
  build: {
    rollupOptions: {
      output: {
        // Without this the qrcode package's internal entry file name
        // ('browser.js') leaks into the chunk name, which is fragile to a
        // dependency version bump. Naming it explicitly keeps the pattern
        // below (and its cache entry) stable.
        manualChunks(id) {
          if (id.includes('node_modules/qrcode/')) return 'qrcode';
        }
      }
    }
  },
  plugins: [
    spaFallback(),
    preact(),
    VitePWA({
      // See src/index.jsx: a new build waits for the user instead of
      // reloading the page under them.
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'icons/*.png', 'icons/icon.svg'],
      manifest: {
        name: 'Le Mie Carte Fedeltà',
        short_name: 'Carte Fedeltà',
        description: 'Gestisci le tue carte fedeltà dal telefono',
        theme_color: '#446F9B',
        background_color: '#F4F4F2',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/fidelity-card-app/',
        start_url: '/fidelity-card-app/',
        lang: 'it',
        // Long-press on the home-screen icon: straight to adding a card.
        shortcuts: [
          {
            name: 'Aggiungi carta',
            short_name: 'Aggiungi',
            url: '/fidelity-card-app/add',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
          }
        ],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/maskable-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // Lets the worker take the page over on its very first install, so
        // the lazily loaded barcode chunks are served from the precache even
        // if the network drops during that first visit. Later builds still
        // wait for "Aggiorna" (see src/index.jsx).
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Only the ZXing scanner (~415 kB) stays out of the precache: it is
        // optional (a number can always be typed in) and CardForm already
        // reports it when the chunk cannot be fetched.
        //
        // The barcode/qrcode chunks must NOT be excluded, even though they are
        // lazily imported. Showing the code at a till, offline, is the whole
        // point of the app: leaving them to runtime caching meant a card first
        // opened offline had no barcode at all. They still stay out of the
        // entry chunk, so the win on first paint is kept.
        globIgnores: ['**/BarcodeScanner-*.js'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/BarcodeScanner-.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'barcode-scanner',
              expiration: { maxEntries: 2 }
            }
          },
          {
            // Safety net only: these chunks are precached, and the precache
            // route answers first. A tab on an older build keeps its chunks
            // anyway, since a waiting worker no longer takes over by itself.
            urlPattern: /\/assets\/(barcode|qrcode)-.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'barcode-render',
              expiration: { maxEntries: 6 }
            }
          }
        ]
      }
    })
  ]
});

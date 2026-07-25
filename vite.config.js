import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
      registerType: 'autoUpdate',
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
          }
        ]
      }
    })
  ]
});

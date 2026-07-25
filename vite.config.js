import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

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
        // The ZXing scanner chunk (~415 kB) and the jsbarcode/qrcode chunks
        // (~92 kB combined) are only needed when a barcode is actually
        // scanned, viewed, or shared. Precaching them made every user
        // download them on first load and again after each update,
        // cancelling out the lazy imports.
        globIgnores: ['**/BarcodeScanner-*.js', '**/barcode-*.js', '**/qrcode-*.js'],
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
            urlPattern: /\/assets\/(barcode|qrcode)-.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'barcode-render',
              expiration: { maxEntries: 4 }
            }
          }
        ]
      }
    })
  ]
});

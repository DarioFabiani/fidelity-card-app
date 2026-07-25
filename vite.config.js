import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/fidelity-card-app/',
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
        // The ZXing scanner chunk is ~415 kB and only needed when the camera
        // is actually used. Precaching it made every user download it on first
        // load and again after each update, cancelling out the lazy import.
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

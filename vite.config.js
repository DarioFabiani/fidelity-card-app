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
        theme_color: '#1565C0',
        background_color: '#FAFAFA',
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ]
});

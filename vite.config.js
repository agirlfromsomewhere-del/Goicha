import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Cardwise',
        short_name: 'Cardwise',
        description: 'An accessible flashcard spaced-repetition app for Japanese learners',
        lang: 'en',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#12141a',
        theme_color: '#12141a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The dictionary (public/dict/**) is ~20MB, deliberately split into
        // an index + lazily-fetched shards (see src/dict.js). Precaching it
        // here would download the whole thing on install and defeat that.
        globIgnores: ['**/dict/**'],
        runtimeCaching: [
          {
            urlPattern: /\/dict\/.*\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'dictionary-data',
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});

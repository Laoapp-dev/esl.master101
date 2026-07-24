import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

// IMPORTANT — GitHub Pages blank-page fix:
// Project pages are served from a subpath, e.g. https://<user>.github.io/<repo>/.
// Using an ABSOLUTE base like '/repo-name/' only works if it exactly matches
// the live URL's subpath — if the repo gets renamed, deployed from a fork, or
// the build ever runs without the GITHUB_PAGES_BASE env var set, every asset
// (JS/CSS) 404s and the page renders completely blank (index.html loads, but
// the app's script never runs). A RELATIVE base ('./') sidesteps this
// entirely: every asset is requested relative to wherever index.html itself
// was served from, so it works correctly no matter what subpath, repo name,
// or custom domain the site ends up on. Combined with HashRouter (already
// used in main.tsx), this is the most robust setup for GitHub Pages.
const base = './'

export default defineConfig({
  base,
  // Baked-in build timestamp + version, shown small on the login screen
  // (AuthPage) and logged to the console on boot. Lets anyone confirm —
  // just by looking at the live site, no repo access needed — whether a
  // given deploy actually took effect, instead of guessing whether "still
  // broken" means the fix didn't work or the browser is just still
  // serving an old cached build.
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __APP_VERSION__: JSON.stringify('1.3.0'),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // Service worker strategy: generateSW for maximum Lighthouse score
      strategies: 'generateSW',
      includeAssets: [
        'favicon.ico',
        'icons/favicon-16.png',
        'icons/favicon-32.png',
        'icons/apple-touch-icon.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-192-maskable.png',
        'icons/icon-512-maskable.png',
      ],
      manifest: {
        name: 'ESLmaster101',
        short_name: 'ESLmaster101',
        description: 'Master English vocabulary with flashcards, quizzes, matching, spelling, and more.',
        theme_color: '#1A1A2E',
        background_color: '#1A1A2E',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation: 'portrait-primary',
        scope: base,
        start_url: base,
        id: base,
        lang: 'en',
        dir: 'ltr',
        prefer_related_applications: false,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
        ],
        screenshots: [
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'ESLmaster101 — Vocabulary Learning',
          },
        ],
        categories: ['education', 'productivity'],
        shortcuts: [
          {
            name: 'Flashcards',
            short_name: 'Flash',
            description: 'Study with flashcards',
            url: base + '#/study/flashcards',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Quick Quiz',
            short_name: 'Quiz',
            description: 'Test your knowledge',
            url: base + '#/study/quiz',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        // The default 9,000+ word curriculum (src/data/defaultVocabulary.json)
        // compiles into a single ~2.5 MB JS chunk. Workbox's default
        // precache limit is 2 MiB, so without raising it here `vite build`
        // throws ("Configure workbox.maximumFileSizeToCacheInBytes...") and
        // the GitHub Actions build step fails outright — which is why no
        // new deploy was ever reaching GitHub Pages. Raised to 5 MB to give
        // headroom as the word list grows.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // CRITICAL: vite-plugin-pwa silently defaults navigateFallback to
        // 'index.html' unless told otherwise. That generates its own
        // NavigationRoute bound to the precached index.html, registered
        // BEFORE the runtimeCaching rule below — and Workbox uses the FIRST
        // matching route, so that default was silently winning and serving
        // a precached/stale index.html for every navigation regardless of
        // what our NetworkFirst rule said. This is what made the previous
        // fix look like it did nothing. Explicitly disabling it here is
        // required for the runtimeCaching navigate rule below to actually
        // take effect at all.
        navigateFallback: undefined,
        // 'html' is deliberately excluded from precaching now; see the
        // navigate-request runtimeCaching rule below instead, which fetches
        // fresh HTML from the network whenever a network is available.
        globPatterns: ['**/*.{js,css,ico,png,svg,woff,woff2,ttf,eot}'],
        // Clean up old cache on activation
        cleanupOutdatedCaches: true,
        // Client claim immediately
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // Matches the actual page navigation (opening/reloading the app).
            // NetworkFirst = always try the network first, with a short
            // timeout, and only fall back to a cached copy if the device is
            // genuinely offline. This guarantees every normal (online) app
            // open gets the current deploy's HTML — and therefore whatever
            // current JS/fixes it references — instead of depending on the
            // service worker's own update-detection timing, which is exactly
            // what kept failing silently on mobile.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache API calls with network-first (fall back to cache)
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'motion-vendor': ['framer-motion'],
          'chart-vendor': ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})

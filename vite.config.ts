import process from 'node:process'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * GitHub Pages serves this project site from `/sgs/`, not the origin root. The
 * deploy workflow passes that prefix in as BASE_PATH (from `configure-pages`,
 * so it stays correct if the repo is renamed or moved to a user site or a
 * custom domain). Unset — dev, `npm run build` locally — it is just `/`.
 */
const basePath = process.env.BASE_PATH ?? '/'

// Vite requires a trailing slash; configure-pages emits `/sgs` without one.
const base = basePath.endsWith('/') ? basePath : `${basePath}/`

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    /**
     * Offline support. Every byte this app needs is static — the card data is
     * compiled into the bundle and the art is plain files under public/ — so
     * there is no API to be offline *from*: precaching the whole build makes
     * the app work with no network at all, not just the pages already visited.
     *
     * That is ~5 MB, fetched by the service worker after first paint. It costs
     * a one-off background download rather than anything on the critical path.
     */
    VitePWA({
      /**
       * Ship a new build without asking. There is no update-prompt UI to hang
       * a 'reload?' toast off, and this is a reference app with no unsaved
       * state to lose, so taking the new version silently is the honest
       * default. Pairs with skipWaiting/clientsClaim below.
       */
      registerType: 'autoUpdate',
      /** Let the plugin inject the registration script into index.html. */
      injectRegister: 'auto',
      /**
       * public/manifest.webmanifest is hand-written and already linked from
       * index.html; don't generate a second one.
       */
      manifest: false,
      workbox: {
        /**
         * Default globs miss the two extensions that matter most here: `webp`
         * is all 88 pieces of card art, and `webmanifest` is what makes the
         * installed app launchable offline.
         */
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,webmanifest}'],
        /**
         * Client-side routing means /c/:id was never a real file. Offline,
         * there is no server to rewrite it either, so the SW serves the shell
         * and lets the router take over — which also makes deep links work on
         * a hard refresh, something GitHub Pages does not do today.
         */
        navigateFallback: `${base}index.html`,
        /** Drop precaches from previous builds instead of accumulating them. */
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      /**
       * `npm run dev` stays a plain, uncached page — a stale SW serving last
       * week's chunks is a confusing way to lose an afternoon. Test the
       * offline behaviour against `npm run build && npm run preview`.
       */
      devOptions: { enabled: false },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        /**
         * Keep the card database in its own chunk, separate from app code.
         *
         * The data can't be *deferred* — the list page renders and searches the
         * whole roster on first paint — but it can be cached independently.
         * Adding a character then invalidates ~10 kB of data rather than the
         * ~250 kB app chunk, and a React or router upgrade leaves the data
         * chunk untouched. Both are fetched in parallel via modulepreload, so
         * the extra request costs nothing on first load.
         *
         * `advancedChunks` is the rolldown API; Vite 8 no longer takes
         * Rollup's `manualChunks`.
         */
        advancedChunks: {
          groups: [{ name: 'card-data', test: /[\\/]src[\\/]data[\\/]/ }],
        },
      },
    },
  },
})

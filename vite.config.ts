import process from 'node:process'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * GitHub Pages serves this project site from `/sgs/`, not the origin root. The
 * deploy workflow passes that prefix in as BASE_PATH (from `configure-pages`,
 * so it stays correct if the repo is renamed or moved to a user site or a
 * custom domain). Unset — dev, `npm run build` locally — it is just `/`.
 */
const basePath = process.env.BASE_PATH ?? '/'

// https://vite.dev/config/
export default defineConfig({
  // Vite requires a trailing slash; configure-pages emits `/sgs` without one.
  base: basePath.endsWith('/') ? basePath : `${basePath}/`,
  plugins: [react()],
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

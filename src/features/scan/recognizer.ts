import type { CardRecognizer } from './types'

/**
 * Returns the card recognizer, or `null` when no model is bundled yet.
 *
 * Keep this function as the ONLY place that knows how the model is loaded. It is
 * called from a lazily-routed page and uses a dynamic `import()`, so neither the
 * runtime (TF.js / ONNX Runtime Web) nor the weights are in the initial bundle —
 * important, since most visits never open the scanner.
 *
 * To wire up a real model:
 *   1. Add the runtime dep, e.g. `npm i @tensorflow/tfjs`.
 *   2. Create `./model/tfjsRecognizer.ts` exporting `createRecognizer(): CardRecognizer`.
 *   3. Put weights in `public/model/` (they must be served, not bundled).
 *   4. Replace the `return null` below with the commented-out import.
 */
export async function loadRecognizer(): Promise<CardRecognizer | null> {
  // const { createRecognizer } = await import('./model/tfjsRecognizer')
  // const recognizer = createRecognizer()
  // await recognizer.load()
  // return recognizer
  return null
}

/** Below this confidence, a match is treated as "keep looking". */
export const MATCH_THRESHOLD = 0.6

/** How often to sample frames. ~4/s is responsive without pinning the CPU. */
export const SAMPLE_INTERVAL_MS = 250

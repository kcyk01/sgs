import type { CardRecognizer } from './types'

/**
 * Returns the card recognizer, or `null` if it cannot be loaded.
 *
 * Keep this function as the ONLY place that knows how recognition is loaded. It
 * is called from a lazily-routed page and uses a dynamic `import()`, so neither
 * the matcher nor its reference descriptors are in the initial bundle —
 * important, since most visits never open the scanner.
 *
 * The current recognizer needs no model weights and no inference runtime: it
 * matches a rectified crop of the card's artwork against ~21 kB of precomputed
 * descriptors. See ./model/localRecognizer.ts for why, and README.md for how to
 * put a learned embedding behind this same call if the eval numbers ask for one.
 */
export async function loadRecognizer(): Promise<CardRecognizer | null> {
  const { createRecognizer } = await import('./model/localRecognizer')
  const recognizer = createRecognizer()
  await recognizer.load()
  return recognizer
}

/** Below this confidence, a match is treated as "keep looking". */
export const MATCH_THRESHOLD = 0.6

/** How often to sample frames. ~4/s is responsive without pinning the CPU. */
export const SAMPLE_INTERVAL_MS = 250

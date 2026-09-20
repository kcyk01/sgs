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

/**
 * Below this confidence a match is offered as a suggestion rather than asserted.
 *
 * The scanner analyses one still on demand, so there is no next frame to defer
 * to — "keep looking" is not an option the way it was for a live feed. Falling
 * back to a ranked shortlist is strictly more useful than showing nothing, since
 * the user can settle an ambiguous result at a glance.
 */
export const MATCH_THRESHOLD = 0.6

/**
 * Live scan mode: how often to sample, and what it takes to accept.
 *
 * `confidenceOf` in `pipeline/match.ts` is a softmax over the top-5 at T=0.02,
 * gated by absolute quality. It reports separation from the runner-up, not
 * probability of correctness, and its constants were calibrated before the
 * fusion pass — so a single lucky frame reaching 0.9 means very little. These
 * four numbers exist so that live mode never has to believe one frame.
 *
 * 3 of the last 4 ticks at 450 ms converges in ~1.5-2 s on a card held steady,
 * which is about as long as someone will hold still, while a card being waved
 * around produces rankings too unstable to ever line three of them up. The
 * confidence floor is above `MATCH_THRESHOLD` because an auto-accept asserts a
 * result nobody asked for, where the shutter's lead row is offered to a user who
 * just pressed a button and is already looking at it.
 */
export const LIVE_TICK_MS = 450
export const LIVE_WINDOW = 4
export const LIVE_AGREEMENT = 3
export const LIVE_CONFIDENCE = 0.75

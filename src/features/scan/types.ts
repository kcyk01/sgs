import type { Quad, Raster } from './pipeline/image'

/**
 * Contract between the camera UI and card recognition. The UI is written against
 * this interface only, so swapping the descriptor matcher for a learned model is
 * a change to `recognizer.ts` and nothing else — see README.md in this folder.
 */

export interface CardMatch {
  /** Character.id of the matched card — the `/c/:id` route to offer. */
  characterId: string
  /**
   * Id of the *printing* that matched, which is a variant id when an alternate
   * art scored best. Carried separately from `characterId` so the UI can show
   * the artwork the scanner actually recognised: a user holding the alternate
   * art of a card should see that art in the results, not the base printing
   * they are not looking at.
   */
  artId: string
  /** 0–1. Above `MATCH_THRESHOLD` the top match is asserted rather than suggested. */
  confidence: number
}

/**
 * The intermediates a recognizer passed through on its way to a result.
 *
 * The scan page's Debug Mode renders these and offers them as PNGs, which is how
 * an eval photo gets made: a downloaded `region` is portrait and is therefore
 * used by `scripts/eval-scan.mjs` as the search region unchanged, so a photo
 * saved this way reproduces in the harness exactly what the app just did.
 */
export interface ScanDebug {
  /** What the pipeline searched: the reticle crop, at `CAPTURE_WIDTH`. */
  region: Raster
  /** Corners within `region`, or null when the search found nothing plausible. */
  quad: Quad | null
  /** The flattened card — or `region` verbatim when `detected` is false. */
  card: Raster
  detected: boolean
}

export interface CardRecognizer {
  /** Fetch + warm up model weights. Called once, lazily. */
  load(): Promise<void>
  /**
   * Classify a single frame. Implementations should be safe to call repeatedly
   * and should return matches sorted by descending confidence.
   */
  recognize(frame: CanvasImageSource): Promise<CardMatch[]>
  /**
   * `recognize`, but keeping the intermediates. Powers Debug Mode only.
   *
   * Optional for the same reason `RecognizerStatus` has an `'unavailable'` arm:
   * a future model-backed recognizer may have no meaningful intermediates to
   * hand back, and should not be forced to invent them. The UI hides the debug
   * panel when it is absent.
   *
   * Returns the matches alongside the intermediates rather than expecting a
   * second `recognize` call, so the images shown are necessarily the ones the
   * matcher scored.
   */
  inspect?(
    frame: CanvasImageSource,
  ): Promise<{ matches: CardMatch[]; debug: ScanDebug } | null>
  /** Release GPU/WASM resources. Called on unmount. */
  dispose(): void
}

export type RecognizerStatus =
  /**
   * `loadRecognizer` returned nothing, so the camera works but cards are not
   * identified. Unreachable with the built-in matcher, which needs no weights
   * and no runtime — kept because a future model-backed recognizer could
   * legitimately decline to load on an unsupported device.
   */
  | 'unavailable'
  | 'loading'
  | 'ready'
  | 'error'

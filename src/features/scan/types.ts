import type { Quad, Raster } from './pipeline/image'
import type { QuadTrace, RectifyMode } from './pipeline/rectify'

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
  /**
   * One entry per geometry pass, in the order they were scored and fused.
   *
   * A list rather than a single card because the recognizer now flattens the one
   * region more than one way and combines the rankings. Showing only one of them
   * would hide exactly the thing worth looking at when a fused result is wrong:
   * which pass dragged it there.
   */
  passes: ScanPass[]
}

/** One geometry pass over the region: how it was flattened, and to what. */
export interface ScanPass {
  /** Which path produced this — see `RectifyMode`. */
  mode: RectifyMode
  /**
   * Corners within `region`.
   *
   * In `detect` mode, what the corner search found, or null when it found
   * nothing plausible. In `framed` mode, the rectangle that was *assumed* — the
   * distinction is `mode`, not this field.
   */
  quad: Quad | null
  /** The flattened card — or `region` verbatim when `detected` is false. */
  card: Raster
  /** Whether `card` is a warp of `quad` rather than the region fallback. */
  detected: boolean
  /**
   * How the corner search got to `quad`: the grayscale, the edge map and the
   * thresholded point cloud, at the 128px the detector works at.
   *
   * Present because `quad` on its own says what was found but never why. The
   * extreme-point method takes the corners of whatever cleared the edge
   * threshold, so a wrong quad and a right one look identical as outlines — the
   * difference is in which pixels were in the cloud, which is the one thing only
   * these images show.
   *
   * Always null in `framed` mode: there is no corner search to trace.
   */
  trace: QuadTrace | null
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

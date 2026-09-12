/**
 * Contract between the camera UI and card recognition. The UI is written against
 * this interface only, so swapping the descriptor matcher for a learned model is
 * a change to `recognizer.ts` and nothing else — see README.md in this folder.
 */

export interface CardMatch {
  /** Character.id of the matched card. */
  characterId: string
  /** 0–1. The UI shows the top match once it clears a threshold. */
  confidence: number
}

export interface CardRecognizer {
  /** Fetch + warm up model weights. Called once, lazily. */
  load(): Promise<void>
  /**
   * Classify a single frame. Implementations should be safe to call repeatedly
   * and should return matches sorted by descending confidence.
   */
  recognize(frame: CanvasImageSource): Promise<CardMatch[]>
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

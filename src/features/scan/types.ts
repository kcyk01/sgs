/**
 * Contract between the camera UI and the (future) trained card-recognition model.
 * The UI is written against this interface only, so dropping in a real model is
 * a single-file change — see README.md in this folder.
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
  /** No model is bundled yet — the UI shows an explanatory placeholder. */
  | 'unavailable'
  | 'loading'
  | 'ready'
  | 'error'

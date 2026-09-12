import { similarity } from './descriptor.ts'

/**
 * Nearest-neighbour search over the reference descriptors, and the conversion
 * from "how similar" to "how confident".
 */

export interface ReferenceCard {
  /** The art id — a character id or a variant id. Also the image filename. */
  artId: string
  /** The character this printing belongs to, i.e. the `/c/:id` route target. */
  characterId: string
  descriptor: Uint8Array
}

export interface Candidate {
  characterId: string
  artId: string
  /** Raw descriptor similarity, 0-1. */
  score: number
  /** Calibrated 0-1, see `confidenceOf`. Only meaningful on the top candidate. */
  confidence: number
}

/**
 * Temperature of the softmax that turns scores into a confidence.
 *
 * Descriptor scores live in a narrow band — a wrong card still scores ~0.6 and a
 * right one ~0.9 — so the gap that matters is a few hundredths. A small
 * temperature is what makes those hundredths decisive; at T = 1 every frame would
 * report a flat ~30% and the UI threshold would never trip.
 */
const SOFTMAX_TEMPERATURE = 0.02

/** How many candidates the softmax considers. Past this the tail is noise. */
const SOFTMAX_TOP_K = 5

/**
 * Absolute-quality gate.
 *
 * Softmax only measures *separation* — how far ahead the winner is — and a
 * blurred or empty frame can produce a clear winner among uniformly terrible
 * matches. Scaling by absolute score as well means "clearly the best of a bad
 * lot" reads as low confidence, which is the honest answer and stops the UI
 * confidently naming a card while the phone is pointed at a table.
 */
const MIN_USEFUL_SCORE = 0.55
const GOOD_SCORE = 0.82

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n))

/**
 * Ranks every reference against the query crops, scoring each reference at
 * whichever crop suits it best.
 *
 * Taking the maximum over crops is what absorbs the inconsistent hand-cropping
 * of the reference images (see `ART_WINDOWS`). It is safe to maximise rather
 * than, say, average because every reference gets the same set of crops to
 * choose from: a wrong card also gets its best shot, so the comparison stays
 * fair and only the genuinely-matching artwork gains much from the extra
 * attempts.
 *
 * An exhaustive scan, on purpose. ~75 references x 16 crops x 280 byte-multiplies
 * is well under a millisecond — far cheaper than the warp that produced the
 * crops. An index would add moving parts and approximation error to save nothing
 * measurable.
 *
 * Results are deduplicated by character: alternate printings are separate
 * references with their own artwork, but they all lead to one card page, so only
 * the best-scoring printing of a character is kept.
 */
export function matchDescriptor(
  queries: readonly Uint8Array[],
  references: readonly ReferenceCard[],
): Candidate[] {
  const best = new Map<string, Candidate>()

  for (const reference of references) {
    let score = 0
    for (const query of queries) {
      const candidate = similarity(query, reference.descriptor).score
      if (candidate > score) score = candidate
    }
    const current = best.get(reference.characterId)
    if (!current || score > current.score)
      best.set(reference.characterId, {
        characterId: reference.characterId,
        artId: reference.artId,
        score,
        confidence: 0,
      })
  }

  const ranked = [...best.values()].sort((a, b) => b.score - a.score)
  assignConfidence(ranked)
  return ranked
}

/**
 * Fills in each candidate's confidence: how far clear of the field it is,
 * tempered by whether the field is any good in absolute terms.
 *
 * Every contender is scored, not just the winner, so a runner-up carries a
 * number that means something — "the second suggestion is 30% likely" is a
 * useful thing to show, whereas a placeholder zero would quietly become a bug
 * the first time the UI offered alternatives.
 */
function assignConfidence(ranked: Candidate[]): void {
  if (ranked.length === 0) return
  const leader = ranked[0].score
  const quality = clamp01((leader - MIN_USEFUL_SCORE) / (GOOD_SCORE - MIN_USEFUL_SCORE))

  // Offset by the leader before exponentiating. Mathematically a no-op — the
  // offset cancels in the ratio — but it keeps the exponent near zero instead of
  // overflowing at a temperature this small.
  const weights = ranked
    .slice(0, SOFTMAX_TOP_K)
    .map((candidate) => Math.exp((candidate.score - leader) / SOFTMAX_TEMPERATURE))
  const total = weights.reduce((sum, weight) => sum + weight, 0)

  for (let i = 0; i < ranked.length; i++)
    ranked[i].confidence = i < weights.length ? (weights[i] / total) * quality : 0
}

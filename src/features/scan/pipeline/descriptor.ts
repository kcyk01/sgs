import { resampleGray, toGray } from './image.ts'
import type { Raster, Rect } from './image.ts'

/**
 * The card descriptor: a fixed 280-byte summary of one piece of artwork, plus the
 * function that scores two of them against each other.
 *
 * ## Why a descriptor and not a trained classifier
 *
 * The roster is a closed set of ~75 printings with exactly one reference image
 * each. That is retrieval, not classification: there is no training set to speak
 * of, and a classifier would have to be retrained and redeployed every time a
 * card is added. Here a new card is one more row emitted by
 * `npm run descriptors` — the same shape of build step as `npm run colors`.
 *
 * ## What is in the 280 bytes
 *
 * - **256 bytes of structure.** The artwork reduced to a 16x16 grid of luma
 *   cells, z-scored across the grid. The z-scoring is what makes this survive a
 *   camera: it subtracts overall brightness and divides out overall contrast, so
 *   a card shot in a dim room and the same card shot under a lamp produce nearly
 *   the same 256 numbers. What remains is composition — where this illustration
 *   is light and dark relative to itself — which is close to unique per card.
 * - **24 bytes of colour.** A saturation-weighted hue histogram, stored as
 *   square roots of the bin shares (see `HUE_STORE_SQRT`). Structure alone
 *   confuses cards with similar poses; hue separates them cheaply.
 *
 * 280 bytes x ~75 cards is ~21 kB of reference data, which is why the match step
 * can be an exhaustive linear scan and still cost well under a millisecond. There
 * is no index to build and no approximate search to get wrong.
 *
 * ## When to replace this
 *
 * If `npm run scan:eval` reports top-5 recall below ~80% on real photos, this
 * descriptor is the thing to swap — not the rectifier. Drop in an off-the-shelf
 * image embedding (MobileNet / CLIP via onnxruntime-web), keep `describe` and
 * `similarity` as the seam, and the rest of the pipeline is unchanged. Note that
 * even then there is nothing to *train*: the reference embeddings are precomputed
 * by the same build script and matching stays a linear scan.
 */

/** Luma grid is GRID x GRID. 16 is 256 cells — enough to fingerprint a composition. */
export const GRID = 16

/** Hue resolution. 24 bins = 15 degrees, matching `build-card-colors.mjs`. */
export const HUE_BINS = 24

export const DESCRIPTOR_BYTES = GRID * GRID + HUE_BINS

/**
 * Quantisation of the z-scored luma grid: `byte = z * 32 + 128`.
 *
 * That puts +/-4 standard deviations inside a byte at 1/32-sigma resolution. Real
 * artwork almost never exceeds 3 sigma in a 16x16 average, so the clamp is
 * effectively unreachable and the resolution is far finer than the noise floor.
 */
const LUMA_SCALE = 32
const LUMA_ZERO = 128

/**
 * Hue bins are stored as `sqrt(share)`, not `share`.
 *
 * Two reasons, one practical and one mathematical. Practically, 24 bins means a
 * typical share is ~0.04, which quantises to 10/255 and throws away most of the
 * byte; the square root spreads those small values across the usable range.
 * Mathematically, the dot product of two sqrt-share vectors *is* the
 * Bhattacharyya coefficient between the two distributions — a standard,
 * well-behaved histogram similarity that lands in [0, 1] with no further
 * normalisation. So the cheap storage fix and the right metric coincide.
 */
const HUE_STORE_SQRT = true

/** Pixels below this saturation carry no usable hue (greys, parchment, armour). */
const MIN_SAT = 0.25
/** Hue is numerically unstable in near-black and in blown-out highlights. */
const MIN_VAL = 0.15
const MAX_VAL = 0.97

/**
 * Cap on pixels visited when building the hue histogram. A histogram is a
 * population statistic — it converges long before you have looked at a
 * megapixel — so the full-resolution image is sampled on a stride instead. Keeps
 * the per-frame cost flat regardless of camera resolution.
 */
const HUE_SAMPLE_BUDGET = 20000

/**
 * How much of the score is structure versus colour.
 *
 * Structure is weighted higher because it is the more discriminative of the two
 * and the more robust to white balance, which no phone camera gets right
 * consistently. Colour is kept in the mix because it cleanly separates cards that
 * structure alone confuses — similar poses in different kingdom palettes.
 */
const LUMA_WEIGHT = 0.75

/** Hue in degrees, plus saturation and value, from 0-255 channels. */
function hsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const c = max - min
  let h = 0
  if (c !== 0) {
    if (max === r) h = ((g - b) / c) % 6
    else if (max === g) h = (b - r) / c + 2
    else h = (r - g) / c + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max === 0 ? 0 : c / max, v: max / 255 }
}

/** Builds the 256-byte z-scored luma grid from a pre-computed luma plane. */
function lumaGrid(
  gray: Float32Array,
  width: number,
  height: number,
  rect: Rect,
  out: Uint8Array,
): void {
  const cells = resampleGray(gray, width, height, GRID, GRID, rect)

  let mean = 0
  for (let i = 0; i < cells.length; i++) mean += cells[i]
  mean /= cells.length

  let variance = 0
  for (let i = 0; i < cells.length; i++) {
    const d = cells[i] - mean
    variance += d * d
  }
  // A flat crop (a lens cap, a white wall) has no structure to normalise. Guard
  // the divide and let it score as featureless rather than amplifying noise into
  // a confident-looking pattern.
  const sd = Math.sqrt(variance / cells.length) || 1

  for (let i = 0; i < cells.length; i++) {
    const z = (cells[i] - mean) / sd
    out[i] = Math.max(0, Math.min(255, Math.round(z * LUMA_SCALE + LUMA_ZERO)))
  }
}

/** Builds the 24-byte saturation-weighted hue histogram over `rect`. */
function hueHistogram(
  raster: Raster,
  rect: Rect,
  out: Uint8Array,
  offset: number,
): void {
  const { data, width } = raster
  const x0 = Math.max(0, Math.floor(rect.x))
  const y0 = Math.max(0, Math.floor(rect.y))
  const x1 = Math.min(raster.width, Math.ceil(rect.x + rect.width))
  const y1 = Math.min(raster.height, Math.ceil(rect.y + rect.height))

  // Stride over rows and columns separately so the sampling stays an even lattice
  // across the rectangle. A single flat stride over a sub-rect would advance in
  // source-row units and drift, sampling some columns far more than others.
  const area = Math.max(1, (x1 - x0) * (y1 - y0))
  const step = Math.max(1, Math.round(Math.sqrt(area / HUE_SAMPLE_BUDGET)))

  const bins = new Float64Array(HUE_BINS)
  let total = 0

  for (let y = y0; y < y1; y += step)
    for (let x = x0; x < x1; x += step) {
      const i = (y * width + x) * 4
      if (data[i + 3] < 128) continue // transparent
      const { h, s, v } = hsv(data[i], data[i + 1], data[i + 2])
      if (s < MIN_SAT || v < MIN_VAL || v > MAX_VAL) continue
      // Weighting by saturation as well as by count stops a large wash of
      // barely-tinted background from outvoting a small, vivid subject — the
      // same reasoning as the dominant-colour script.
      const bin = Math.min(HUE_BINS - 1, Math.floor((h / 360) * HUE_BINS))
      bins[bin] += s
      total += s
    }

  if (total === 0) {
    // Genuinely achromatic art. Leave the histogram at zero: its contribution to
    // the score then drops out, and structure decides the match on its own.
    out.fill(0, offset, offset + HUE_BINS)
    return
  }

  for (let i = 0; i < HUE_BINS; i++) {
    const share = bins[i] / total
    const stored = HUE_STORE_SQRT ? Math.sqrt(share) : share
    out[offset + i] = Math.round(stored * 255)
  }
}

/** Reduces one artwork raster to its 280-byte descriptor. */
export function describe(raster: Raster): Uint8Array {
  return describeWindows(raster, [
    { x: 0, y: 0, width: raster.width, height: raster.height },
  ])[0]
}

/**
 * Describes several crops of the same image, sharing one luma pass.
 *
 * The matcher needs this because the reference images were cropped by hand and
 * so sit at slightly different scales and offsets within their cards — see
 * `ART_WINDOWS` in rectify.ts. Trying a dozen crops is what absorbs that, and
 * doing it naively would redo the whole-image greyscale conversion a dozen
 * times. Converting once and resampling out of the shared plane made the search
 * roughly twice as cheap in practice, which is what keeps it inside the frame
 * budget on a phone.
 */
export function describeWindows(
  raster: Raster,
  windows: readonly Rect[],
): Uint8Array[] {
  const gray = toGray(raster)
  return windows.map((rect) => {
    const out = new Uint8Array(DESCRIPTOR_BYTES)
    lumaGrid(gray, raster.width, raster.height, rect, out)
    hueHistogram(raster, rect, out, GRID * GRID)
    return out
  })
}

export interface Similarity {
  /** Structural agreement, 0-1. */
  luma: number
  /** Colour agreement, 0-1. */
  hue: number
  /** The weighted blend the matcher ranks on, 0-1. */
  score: number
}

/**
 * Scores two descriptors.
 *
 * Luma uses cosine similarity. Both vectors are already zero-mean by
 * construction, so cosine here is exactly the Pearson correlation between the two
 * grids — "do these two images get lighter and darker in the same places", which
 * is the question worth asking. It is mapped from [-1, 1] onto [0, 1] so both
 * halves of the blend share a scale.
 */
export function similarity(a: Uint8Array, b: Uint8Array): Similarity {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < GRID * GRID; i++) {
    const av = a[i] - LUMA_ZERO
    const bv = b[i] - LUMA_ZERO
    dot += av * bv
    normA += av * av
    normB += bv * bv
  }
  const denom = Math.sqrt(normA * normB)
  const cosine = denom > 0 ? dot / denom : 0
  const luma = (cosine + 1) / 2

  // Bhattacharyya coefficient — see HUE_STORE_SQRT. Both sides are sqrt-shares
  // scaled by 255, so dividing by 255^2 returns it to its natural [0, 1].
  let hueDot = 0
  for (let i = GRID * GRID; i < DESCRIPTOR_BYTES; i++) hueDot += a[i] * b[i]
  const hue = Math.min(1, hueDot / (255 * 255))

  return { luma, hue, score: LUMA_WEIGHT * luma + (1 - LUMA_WEIGHT) * hue }
}

/** Packs a descriptor for the generated reference module. */
export function encodeDescriptor(descriptor: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < descriptor.length; i++) binary += String.fromCharCode(descriptor[i])
  return btoa(binary)
}

/** Inverse of `encodeDescriptor`. `atob` exists in both browsers and Node >= 16. */
export function decodeDescriptor(encoded: string): Uint8Array {
  const binary = atob(encoded)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

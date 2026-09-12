import { resampleGray, sobelMagnitude, toGray } from './image.ts'
import type { Quad, Raster, Rect } from './image.ts'
import { warpQuad } from './homography.ts'

/**
 * Finding the card in a frame and flattening it into a canonical artwork crop.
 *
 * Two stages. First locate the card's four corners; then warp those corners onto
 * a fixed rectangle and cut out the region the reference images actually cover.
 *
 * The corner search is deliberately modest. It assumes the user has roughly
 * framed the card inside the on-screen reticle — which the UI asks them to do —
 * and only has to refine that guess, not find a card in an arbitrary scene. Every
 * failure path falls back to the reticle rectangle itself, so a bad detection can
 * never do worse than not detecting at all. If `npm run scan:eval` shows this
 * step is the accuracy bottleneck, the upgrade is a real contour finder
 * (OpenCV.js `findContours` + `approxPolyDP`), and only `detectCardQuad` changes.
 */

/** Physical card aspect, 63mm x 88mm. The warp target and the plausibility gate. */
export const CARD_ASPECT = 63 / 88

/**
 * Size of the flattened card. Small on purpose: the descriptor immediately
 * reduces it to a 16x16 grid, so resolution beyond what survives that averaging
 * is pure per-frame cost. 200x280 keeps a full warp comfortably inside the
 * 250 ms sampling budget on a mid-range phone.
 */
export const CARD_WIDTH = 200
export const CARD_HEIGHT = Math.round(CARD_WIDTH / CARD_ASPECT)

/** A candidate artwork crop, as fractions of the flattened card. */
export interface ArtWindow {
  /** Inset from *each* side, so the crop stays horizontally centred. */
  inset: number
  top: number
  height: number
}

/**
 * The crops of a flattened card that get compared against the references.
 *
 * This is the subtlest part of the whole feature. The references in
 * `public/cards/` are *artwork crops* — no frame, no name, no health, no rules
 * box — so a whole photographed card cannot be compared against them directly.
 * Worse, those crops were made by hand from assorted sources, so each one sits at
 * a slightly different scale and offset within its card. There is no single
 * correct window to cut.
 *
 * So the nuisance parameter gets searched rather than guessed, exactly as
 * perspective does one step earlier: describe the card at every window below and
 * let each reference match against its best one. On a real photo set this took
 * top-1 from 43% to 71% — by far the largest single gain in the pipeline, and
 * the reason the descriptor was worth keeping rather than replacing.
 *
 * The grid is deliberately small. Measured on real photos, 16 windows scored
 * identically to 33 and to 45, so the rest was pure per-frame cost. Re-measure
 * with `npm run scan:eval -- --sweep` if the reference crops are ever
 * regenerated to a consistent frame — at which point most of this can collapse
 * back to a single window.
 */
export const ART_WINDOWS: readonly ArtWindow[] = [0, 0.06].flatMap((inset) =>
  [0, 0.04].flatMap((top) =>
    [0.72, 0.8, 0.88, 0.96].map((height) => ({ inset, top, height })),
  ),
)

/** The candidate windows as pixel rectangles within a given flattened card. */
export function artWindowRects(card: Raster): Rect[] {
  return ART_WINDOWS.map(({ inset, top, height }) => ({
    x: inset * card.width,
    y: top * card.height,
    width: (1 - 2 * inset) * card.width,
    height: Math.min(height, 1 - top) * card.height,
  }))
}

/** Working width for the corner search. Enough edge detail, ~16k pixels of work. */
const DETECT_WIDTH = 128

/** Gradient magnitudes above this percentile are treated as card edges. */
const EDGE_PERCENTILE = 0.88

/** Below this many edge pixels the frame is blurred, dark, or empty. */
const MIN_EDGE_POINTS = 120

/**
 * Fraction of extreme points discarded at each corner.
 *
 * The corner search takes extremes of a point cloud, and a single speck of
 * sensor noise in a corner of the ROI is an extreme point. Stepping in half a
 * percent costs nothing on a real card edge, whose corner is supported by many
 * pixels, and discards exactly that kind of lone outlier.
 */
const CORNER_TRIM = 0.005

/** A detected quad must fill at least this much of the search region. */
const MIN_AREA_FRACTION = 0.2

/** Tolerance on the detected aspect, wide enough for a steep viewing angle. */
const MIN_DETECTED_ASPECT = 0.45
const MAX_DETECTED_ASPECT = 1.05

/**
 * Locates the card's corners within `region`, in `region`-local coordinates.
 *
 * The method: threshold the gradient image to a cloud of edge pixels, then take
 * the extremes of `x + y` and `x - y`. Those four extremes are the corners of any
 * convex quadrilateral, whatever its rotation — which is the trick that makes
 * this work without a contour tracer. It is cheap and rotation-tolerant; what it
 * cannot do is reject a cluttered background, which is what the plausibility
 * gates below and the reticle in front of the user are both for.
 */
export function detectCardQuad(region: Raster): Quad | null {
  const scale = region.width / DETECT_WIDTH
  const w = DETECT_WIDTH
  const h = Math.max(1, Math.round(region.height / scale))

  const gray = resampleGray(toGray(region), region.width, region.height, w, h)
  const edges = sobelMagnitude(gray, w, h)

  // Percentile rather than a fixed threshold: absolute gradient magnitude scales
  // with exposure and contrast, so any constant would be tuned to one lighting
  // condition. "The strongest 12% of edges in this frame" is self-calibrating.
  const sorted = Float32Array.from(edges).sort()
  const threshold = sorted[Math.floor(sorted.length * EDGE_PERCENTILE)]
  if (!(threshold > 0)) return null

  const xs: number[] = []
  const ys: number[] = []
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (edges[y * w + x] >= threshold) {
        xs.push(x)
        ys.push(y)
      }

  if (xs.length < MIN_EDGE_POINTS) return null

  const n = xs.length
  const trim = Math.min(Math.floor(n * CORNER_TRIM), Math.floor((n - 1) / 2))
  const order = (key: (i: number) => number): number[] =>
    Array.from({ length: n }, (_, i) => i).sort((a, b) => key(a) - key(b))

  const bySum = order((i) => xs[i] + ys[i])
  const byDiff = order((i) => xs[i] - ys[i])

  const topLeft = bySum[trim]
  const bottomRight = bySum[n - 1 - trim]
  const bottomLeft = byDiff[trim]
  const topRight = byDiff[n - 1 - trim]

  const point = (i: number): readonly [number, number] =>
    [xs[i] * scale, ys[i] * scale] as const

  let quad: Quad = [
    point(topLeft),
    point(topRight),
    point(bottomRight),
    point(bottomLeft),
  ]

  // A card lying on its side is a thing people do; a card held upside down is
  // not. So landscape is corrected by rolling the corner order, which rotates the
  // warp by 90 degrees, and the 180-degree ambiguity is left alone — it is
  // unresolvable from geometry and would need a second warp to settle.
  const side = (a: readonly [number, number], b: readonly [number, number]) =>
    Math.hypot(a[0] - b[0], a[1] - b[1])
  const width = (side(quad[0], quad[1]) + side(quad[3], quad[2])) / 2
  const height = (side(quad[0], quad[3]) + side(quad[1], quad[2])) / 2
  if (width > height) quad = [quad[1], quad[2], quad[3], quad[0]]

  return isPlausibleCard(quad, region) ? quad : null
}

/**
 * Rejects detections that cannot be a card held up to the camera.
 *
 * Each gate corresponds to a real failure seen in this kind of detector: a quad
 * collapsing onto a strong background line, the extremes latching onto the ROI
 * border and returning the whole region, and a shape whose proportions are not a
 * card at any viewing angle.
 */
function isPlausibleCard(quad: Quad, region: Raster): boolean {
  // Shoelace area. Also catches self-intersecting quads, which come out negative
  // or near zero and fail the area gate on their own.
  let area = 0
  for (let i = 0; i < 4; i++) {
    const [x0, y0] = quad[i]
    const [x1, y1] = quad[(i + 1) % 4]
    area += x0 * y1 - x1 * y0
  }
  area = Math.abs(area) / 2
  if (area < MIN_AREA_FRACTION * region.width * region.height) return false

  const side = (a: readonly [number, number], b: readonly [number, number]) =>
    Math.hypot(a[0] - b[0], a[1] - b[1])
  const top = side(quad[0], quad[1])
  const right = side(quad[1], quad[2])
  const bottom = side(quad[2], quad[3])
  const left = side(quad[3], quad[0])
  if (Math.min(top, right, bottom, left) < 0.1 * Math.min(region.width, region.height))
    return false

  const aspect = ((top + bottom) / 2) / ((left + right) / 2)
  return aspect >= MIN_DETECTED_ASPECT && aspect <= MAX_DETECTED_ASPECT
}

export interface RectifyResult {
  /** The flattened card, ready for `artWindowRects` + `describeWindows`. */
  card: Raster
  /** Whether corners were found, or the search region was used verbatim. */
  detected: boolean
}

/**
 * Full geometry stage: search region in, flattened card out.
 *
 * `region` is the part of the frame to search — the reticle rectangle in the app,
 * the whole image in the eval harness. Passing a region rather than the whole
 * frame is what keeps the corner search honest, since it bounds the clutter the
 * extreme-point method has to survive.
 */
export function rectifyCard(region: Raster): RectifyResult {
  const quad = detectCardQuad(region)
  const card = quad ? warpQuad(region, quad, CARD_WIDTH, CARD_HEIGHT) : null

  // No corners found: fall back to treating the search region as the card. That
  // is wrong about perspective, but the reticle is already card-shaped and
  // roughly filled, so the descriptor usually still lands on the right card.
  // Degrading rather than failing is the point — the scanner keeps working while
  // the user reframes, instead of going blank and looking broken.
  return { card: card ?? region, detected: card !== null }
}

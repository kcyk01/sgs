import { grayToRaster, resampleGray, sobelMagnitude, toGray } from './image.ts'
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
 * buys nothing. 200x280 keeps a full warp well inside the budget of a single
 * on-demand capture, even on a mid-range phone.
 */
export const CARD_WIDTH = 200
export const CARD_HEIGHT = Math.round(CARD_WIDTH / CARD_ASPECT)

/**
 * A candidate artwork crop: how much to trim off each edge of the flattened
 * card, as a fraction of its width or height.
 *
 * Per-edge rather than a single symmetric inset, because the card's furniture is
 * not symmetric — see `ART_WINDOWS`.
 */
export interface ArtWindow {
  /** Trimmed from the left edge, where the name banner runs. */
  left: number
  /** Trimmed from the right edge — just the border. */
  right: number
  /** Trimmed from the top, where the health pips sit. */
  top: number
  /** Trimmed from the bottom, where the rules box sits. */
  bottom: number
}

/**
 * The crops of a flattened card that get compared against the references.
 *
 * This is the subtlest part of the whole feature, and the easiest to get wrong.
 * The references in `public/cards/` are *artwork crops* — no frame, no name, no
 * health, no rules box — while the camera sees a whole card. So the card is
 * warped flat, and then the artwork has to be cut back out of it before the two
 * are comparable.
 *
 * ## The numbers are measured, not guessed
 *
 * Searching every crop of every test photo against its own correct reference put
 * the ideal window at a median of `left 0.16, right 0.08, top 0.08, bottom 0.08`.
 * Those correspond to real things on the card: the vertical **name banner** down
 * the left, the **health pips** across the top, and the **rules box** across the
 * bottom. The left trim is roughly twice the right — the furniture is asymmetric,
 * so the window must be too. An earlier symmetric grid capped at 0.06 a side
 * could not express that, and left every single photo matching on artwork
 * contaminated with banner and pips. Correcting it moved top-1 from 68.8% to
 * 81.3% on the test set.
 *
 * ## More windows is not better
 *
 * Every window is another chance for a *wrong* card to find a flattering crop,
 * so the search has a genuine optimum rather than just a cost ceiling. Measured:
 * 12 windows scored 81.3%, and an 18-window grid that merely added a deeper
 * bottom trim dropped to 75.0%. Do not widen this grid without re-running
 * `npm run scan:eval` — the intuition that more coverage helps is wrong here.
 *
 * Re-measure with `npm run scan:eval -- --sweep`, which scores each window alone
 * and all of them together.
 */
export const ART_WINDOWS: readonly ArtWindow[] = [0.12, 0.16, 0.2].flatMap((left) =>
  [0.08, 0.12].flatMap((top) =>
    [0, 0.08].map((bottom) => ({ left, right: 0.06, top, bottom })),
  ),
)

/** One candidate window as a pixel rectangle within a given flattened card. */
export function artWindowRect(card: Raster, window: ArtWindow): Rect {
  return {
    x: window.left * card.width,
    y: window.top * card.height,
    width: Math.max(1, (1 - window.left - window.right) * card.width),
    height: Math.max(1, (1 - window.top - window.bottom) * card.height),
  }
}

/** The candidate windows as pixel rectangles within a given flattened card. */
export function artWindowRects(card: Raster): Rect[] {
  return ART_WINDOWS.map((window) => artWindowRect(card, window))
}

/**
 * What the reference descriptors were built from, which decides how a captured
 * card has to be cropped before it can be compared against them.
 *
 * - `artwork` — references are the art-only crops in `public/cards/`. The camera
 *   sees a whole card, so the artwork has to be cut back out of it, and where
 *   exactly is a guess that varies per card. Hence `ART_WINDOWS`.
 * - `full-card` — references are scans of whole cards, from `full-card/`. The
 *   correspondence is then exact: compare the whole flattened card against the
 *   whole reference, no cropping and nothing to calibrate. The frame, name
 *   banner, pips and rules box stop being contamination to remove and start
 *   being signal, since they differ between cards.
 *
 * The two are mutually exclusive. A whole-card query scores well against
 * whole-card references and badly against artwork ones, so a half-converted
 * reference table would systematically favour whichever kind matched the
 * framing — which is why the mode is recorded in the generated module rather
 * than assumed.
 */
export type ReferenceMode = 'artwork' | 'full-card'

/**
 * The crops of a flattened card to compare against the references.
 *
 * One window in `full-card` mode: the card itself. Measured on the two available
 * full-card scans, jittering the edges by a few percent raised the margin
 * slightly — but with only two references in play there is no third card for the
 * extra windows to flatter, so that is not evidence. Re-measure before adding
 * any: the artwork-mode grid taught us that extra windows can and do make things
 * worse.
 */
export function queryWindowRects(card: Raster, mode: ReferenceMode): Rect[] {
  return mode === 'full-card'
    ? [{ x: 0, y: 0, width: card.width, height: card.height }]
    : artWindowRects(card)
}

/**
 * Width the search region is captured at before any of this runs.
 *
 * Measured: 320, 400 and 480 all score 81.3% top-1 on the test photos, while 640
 * and 800 drop to 75.0%. Resolution buys nothing here — the descriptor averages
 * the detail away regardless — and past ~480 it starts to hurt, because the
 * corner detector's edge threshold is a percentile and finer detail dilutes the
 * card's own edges with texture from the print and the background.
 *
 * 480 sits at the top of the flat band, which leaves the corner search the most
 * to work with at no measured cost. 320 would be ~2x cheaper for the same
 * accuracy if the frame budget ever matters.
 *
 * An earlier version of this comment claimed 480 beat 320 outright. That was
 * measured against the old symmetric `ART_WINDOWS`, and stopped being true once
 * those were corrected — a reminder to re-measure constants when the thing they
 * were tuned against changes.
 */
export const CAPTURE_WIDTH = 480

/**
 * Working width for the corner search. Enough edge detail, ~16k pixels of work.
 * Exported so `npm run scan:eval -- --explain` can report the real threshold
 * rather than a copy of it that could drift.
 */
export const DETECT_WIDTH = 128

/** Gradient magnitudes above this percentile are treated as card edges. */
export const EDGE_PERCENTILE = 0.88

/**
 * Below this many edge pixels the frame is blurred, dark, or empty.
 *
 * Exported for the same reason as `EDGE_PERCENTILE`: Debug Mode reports the
 * count against the bar it was actually held to, rather than against a copy of
 * the number that could drift from this one.
 */
export const MIN_EDGE_POINTS = 120

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
 * The corner search's intermediates, at the resolution it actually runs at.
 *
 * Built only when asked for — three RGBA allocations that nothing outside Debug
 * Mode reads. Everything in here is made from the very buffers the detector
 * thresholds and sorts, rather than recomputed alongside them: a "show roughly
 * what it did" path is free to disagree with the detector at precisely the
 * moment the detector is wrong, which is the only moment any of this is worth
 * looking at.
 */
export interface QuadTrace {
  /** Grayscale at `DETECT_WIDTH` — what the Sobel saw, not what the camera did. */
  gray: Raster
  /** Sobel magnitude, scaled so the frame's strongest gradient is white. */
  edges: Raster
  /**
   * The point cloud the corners are extremes of: every above-threshold pixel lit
   * over a dimmed copy of `gray`.
   *
   * The most useful of the three, because the corner search has no opinion about
   * *which* points it is handed — it takes the extremes of whatever cleared the
   * percentile. A quad that traces the background is almost always this image
   * showing edge points on a table seam or a sleeve, not the corner maths going
   * wrong.
   */
  points: Raster
  /** The absolute magnitude `EDGE_PERCENTILE` resolved to in this frame. */
  threshold: number
  /** How many pixels cleared it. Under `MIN_EDGE_POINTS` the detector gives up. */
  pointCount: number
}

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
export function detectCardQuad(
  region: Raster,
  onTrace?: (trace: QuadTrace) => void,
): Quad | null {
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

  if (onTrace) {
    // Emitted here rather than after the gates, so a frame that fails one is
    // still explicable: the interesting question about a rejected detection is
    // what the detector was looking at, and by the time `null` is returned that
    // is gone. The one failure with nothing to show is the `threshold > 0` exit
    // above — a frame with no gradient anywhere is three black rectangles.
    const lit = Float32Array.from(gray, (v) => v * 0.35)
    for (let i = 0; i < xs.length; i++) lit[ys[i] * w + xs[i]] = 255
    onTrace({
      gray: grayToRaster(gray, w, h),
      edges: grayToRaster(edges, w, h, sorted[sorted.length - 1]),
      points: grayToRaster(lit, w, h),
      threshold,
      pointCount: xs.length,
    })
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

/** The measurements every gate and every report of a quad is phrased in. */
export interface QuadMetrics {
  /** Shoelace area in region pixels. */
  area: number
  /** `area` as a fraction of the whole search region. */
  areaFraction: number
  /** Mean width over mean height. A card square-on to the lens is `CARD_ASPECT`. */
  aspect: number
  /** Edge lengths, in the corner order TL->TR->BR->BL. */
  sides: { top: number; right: number; bottom: number; left: number }
}

/**
 * Everything the gates below — and the debug UI, and the eval harness — want to
 * know about a detected quad.
 *
 * Exported because all three used to compute it separately: `isPlausibleCard`
 * inline, `--explain` in scripts/eval-scan.mjs, and now the scan page's debug
 * panel. Three copies of a shoelace sum is three chances for the number the user
 * reads to disagree with the number the gate actually applied.
 */
export function quadMetrics(quad: Quad, region: Raster): QuadMetrics {
  // Shoelace area. Also catches self-intersecting quads, which come out negative
  // or near zero and fail the area gate on their own.
  let area = 0
  for (let i = 0; i < 4; i++) {
    const [x0, y0] = quad[i]
    const [x1, y1] = quad[(i + 1) % 4]
    area += x0 * y1 - x1 * y0
  }
  area = Math.abs(area) / 2

  const side = (a: readonly [number, number], b: readonly [number, number]) =>
    Math.hypot(a[0] - b[0], a[1] - b[1])
  const sides = {
    top: side(quad[0], quad[1]),
    right: side(quad[1], quad[2]),
    bottom: side(quad[2], quad[3]),
    left: side(quad[3], quad[0]),
  }

  return {
    area,
    areaFraction: area / (region.width * region.height),
    aspect: (sides.top + sides.bottom) / 2 / ((sides.left + sides.right) / 2),
    sides,
  }
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
  const { areaFraction, aspect, sides } = quadMetrics(quad, region)

  if (areaFraction < MIN_AREA_FRACTION) return false

  const shortest = Math.min(sides.top, sides.right, sides.bottom, sides.left)
  if (shortest < 0.1 * Math.min(region.width, region.height)) return false

  return aspect >= MIN_DETECTED_ASPECT && aspect <= MAX_DETECTED_ASPECT
}

export interface RectifyResult {
  /** The flattened card, ready for `artWindowRects` + `describeWindows`. */
  card: Raster
  /** Whether corners were found, or the search region was used verbatim. */
  detected: boolean
  /**
   * The corners, in region pixels, or null when the search failed.
   *
   * Carried out rather than discarded so the debug overlay can draw the quad on
   * the very region it was found in. Without it the only way to see what the
   * detector locked onto is to re-run `detectCardQuad`, which is both wasteful
   * and a second code path that could drift from this one.
   */
  quad: Quad | null
  /**
   * The corner search's intermediates, or null unless `trace` was asked for.
   *
   * Off by default because `recognize` runs this path too and would otherwise
   * allocate three images per scan for nobody to look at.
   */
  trace: QuadTrace | null
}

/**
 * How `rectifyCard` gets from the search region to a flattened card.
 *
 * - `detect` — the original path: find the card's corners, warp them flat.
 * - `framed` — assume the user did the framing, and take the search region
 *   itself as the card.
 *
 * `framed` is an experiment, not a replacement. It trades away every correction
 * for perspective, rotation and sloppy alignment in exchange for never being
 * *wrong* about where the card is — which is the detect path's one real failure
 * mode, since a quad that latches onto a table seam or a sleeve produces a
 * confidently warped image of the wrong thing. Whether that trade pays depends
 * entirely on how well people actually centre the card, so decide it with
 * `npm run scan:eval -- --framed`, not by argument.
 */
export type RectifyMode = 'detect' | 'framed'

/**
 * Trimmed off each edge of the search region in `framed` mode, as a fraction.
 *
 * Zero to start: `SEARCH_MARGIN` in `model/frame.ts` already pulls the region a
 * touch inside the reticle, so a well-centred card should fill it. This is the
 * knob to turn if the flattened cards come out with a rim of background around
 * them — every such rim is signal the descriptor has to average over in
 * `full-card` mode, where the card's own border is one of the features.
 */
export const FRAMED_INSET = 0

/**
 * The search region as a quad, inset by `FRAMED_INSET`.
 *
 * Phrased as a quad rather than a `Rect` so the framed path can hand it to the
 * same `warpQuad` the detect path uses, and so `RectifyResult.quad` carries the
 * rectangle that was actually assumed — the debug overlay then draws the framed
 * path's assumption exactly where it draws the detect path's detection.
 */
export function framedQuad(region: Raster): Quad {
  const x0 = FRAMED_INSET * region.width
  const y0 = FRAMED_INSET * region.height
  const x1 = region.width - x0
  const y1 = region.height - y0
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ]
}

/**
 * Full geometry stage: search region in, flattened card out.
 *
 * `region` is the part of the frame to search — the reticle rectangle in the app,
 * the whole image in the eval harness. Passing a region rather than the whole
 * frame is what keeps the corner search honest, since it bounds the clutter the
 * extreme-point method has to survive.
 */
export function rectifyCard(
  region: Raster,
  options: { trace?: boolean; mode?: RectifyMode } = {},
): RectifyResult {
  if (options.mode === 'framed') return rectifyFramedCard(region)

  // Through a holder rather than a bare `let`, because control-flow analysis
  // cannot see that a callback passed into a function was called and would type
  // the result as `null`.
  const traced: { value: QuadTrace | null } = { value: null }
  const quad = detectCardQuad(
    region,
    options.trace ? (trace) => (traced.value = trace) : undefined,
  )
  const card = quad ? warpQuad(region, quad, CARD_WIDTH, CARD_HEIGHT) : null

  // No corners found: fall back to treating the search region as the card. That
  // is wrong about perspective, but the reticle is already card-shaped and
  // roughly filled, so the descriptor usually still lands on the right card.
  // Degrading rather than failing is the point — the scanner keeps working while
  // the user reframes, instead of going blank and looking broken.
  return {
    card: card ?? region,
    detected: card !== null,
    quad: card ? quad : null,
    trace: traced.value,
  }
}

/**
 * The `framed` path: no corner search, no perspective correction.
 *
 * Still goes through `warpQuad` rather than just returning `region`, for two
 * reasons. It produces a `CARD_WIDTH` x `CARD_HEIGHT` card like the detect path
 * does, so the two are interchangeable everywhere downstream and comparable to
 * each other in the eval harness. And it is the same bilinear sampler, so the
 * only difference between the two paths is which quad went in — which is the
 * point of the experiment. On a card-shaped region the homography degenerates to
 * a plain scale, so this costs one pass over 200x280 pixels and nothing else.
 *
 * `trace` is always null: the trace describes the corner search, and there is no
 * corner search here. Reporting an empty one would be worse than reporting none.
 */
function rectifyFramedCard(region: Raster): RectifyResult {
  const quad = framedQuad(region)
  const card = warpQuad(region, quad, CARD_WIDTH, CARD_HEIGHT)

  // The same degrade as the detect path, for the same reason. Only reachable if
  // the region is a sliver — a rectangle is never otherwise degenerate.
  return {
    card: card ?? region,
    detected: card !== null,
    quad: card ? quad : null,
    trace: null,
  }
}

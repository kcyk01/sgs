/**
 * The raster type and resampling primitives the rest of the pipeline is built on.
 *
 * Nothing in `pipeline/` touches the DOM or `sharp`. That is the whole point: the
 * browser feeds it `ImageData` lifted off a canvas, while the build script and the
 * eval harness feed it raw pixels from `sharp`, and both therefore run *exactly*
 * the same arithmetic. A reference descriptor computed at build time is only
 * comparable to a query descriptor computed on a phone if the two were produced
 * identically, so any platform-specific shortcut in here would surface as a quiet
 * accuracy loss rather than an error. Keeping this half pure is what prevents it —
 * and it is also what lets `npm run scan:eval` measure the real pipeline offline
 * instead of an approximation of it.
 */

/** RGBA, 4 bytes per pixel, row-major — the same layout as `ImageData.data`. */
export interface Raster {
  data: Uint8ClampedArray
  width: number
  height: number
}

/** A rectangle in pixel coordinates. */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** A quadrilateral as four [x, y] corners, ordered TL, TR, BR, BL. */
export type Quad = readonly [
  readonly [number, number],
  readonly [number, number],
  readonly [number, number],
  readonly [number, number],
]

/**
 * Rec. 601 luma. Matched to what `sharp().greyscale()` and canvas filters use, so
 * a reference and a camera frame of the same artwork land on the same numbers.
 */
export function toGray(raster: Raster): Float32Array {
  const { data, width, height } = raster
  const out = new Float32Array(width * height)
  for (let i = 0, p = 0; p < out.length; i += 4, p++)
    out[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  return out
}

/**
 * Area-average resample.
 *
 * Deliberately not nearest-neighbour or bilinear: every input pixel contributes
 * to exactly one output cell in proportion to how much of it the cell covers,
 * which means the 16x16 descriptor grid is a genuine average of the artwork
 * rather than 256 point samples of it. That averaging *is* the noise rejection —
 * sensor grain, JPEG blocking and the print's halftone dots all wash out, while
 * the large-scale composition that actually identifies a card survives.
 *
 * Only ever used to shrink. Asked to enlarge it degrades to nearest-neighbour,
 * which is fine because nothing upstream enlarges.
 *
 * `rect` restricts it to a sub-rectangle of the source. That exists so the
 * matcher can take a dozen different crops of one card without copying a dozen
 * sub-images first — it reads straight out of the shared buffer instead.
 */
export function resampleGray(
  src: Float32Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  rect: Rect = { x: 0, y: 0, width: srcW, height: srcH },
): Float32Array {
  const out = new Float32Array(dstW * dstH)
  const xRatio = rect.width / dstW
  const yRatio = rect.height / dstH

  for (let dy = 0; dy < dstH; dy++) {
    const y0 = rect.y + dy * yRatio
    const y1 = rect.y + (dy + 1) * yRatio
    const iy0 = Math.max(0, Math.floor(y0))
    const iy1 = Math.min(srcH, Math.ceil(y1))

    for (let dx = 0; dx < dstW; dx++) {
      const x0 = rect.x + dx * xRatio
      const x1 = rect.x + (dx + 1) * xRatio
      const ix0 = Math.max(0, Math.floor(x0))
      const ix1 = Math.min(srcW, Math.ceil(x1))

      let sum = 0
      let weight = 0
      for (let y = iy0; y < iy1; y++) {
        // Partial coverage at the two ends of the span; 1 for interior rows.
        const wy = Math.min(y + 1, y1) - Math.max(y, y0)
        if (wy <= 0) continue
        const row = y * srcW
        for (let x = ix0; x < ix1; x++) {
          const wx = Math.min(x + 1, x1) - Math.max(x, x0)
          if (wx <= 0) continue
          const w = wx * wy
          sum += src[row + x] * w
          weight += w
        }
      }
      out[dy * dstW + dx] = weight > 0 ? sum / weight : 0
    }
  }
  return out
}

/**
 * Sobel gradient magnitude, used only to find the card's edges.
 *
 * The border is left at zero rather than clamped or mirrored: a mirrored border
 * invents a strong artificial edge exactly where the frame ends, and the corner
 * search downstream takes extreme points, so it would lock onto that artefact
 * every single time instead of onto the card.
 */
export function sobelMagnitude(
  gray: Float32Array,
  width: number,
  height: number,
): Float32Array {
  const out = new Float32Array(width * height)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      const tl = gray[i - width - 1]
      const tc = gray[i - width]
      const tr = gray[i - width + 1]
      const ml = gray[i - 1]
      const mr = gray[i + 1]
      const bl = gray[i + width - 1]
      const bc = gray[i + width]
      const br = gray[i + width + 1]
      const gx = tr + 2 * mr + br - (tl + 2 * ml + bl)
      const gy = bl + 2 * bc + br - (tl + 2 * tc + tr)
      out[i] = Math.hypot(gx, gy)
    }
  }
  return out
}

/** Copies a sub-rectangle out of a raster. The rect is clamped to the bounds. */
export function cropRaster(raster: Raster, rect: Rect): Raster {
  const x0 = Math.max(0, Math.round(rect.x))
  const y0 = Math.max(0, Math.round(rect.y))
  const x1 = Math.min(raster.width, Math.round(rect.x + rect.width))
  const y1 = Math.min(raster.height, Math.round(rect.y + rect.height))
  const width = Math.max(1, x1 - x0)
  const height = Math.max(1, y1 - y0)

  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    const src = ((y0 + y) * raster.width + x0) * 4
    data.set(raster.data.subarray(src, src + width * 4), y * width * 4)
  }
  return { data, width, height }
}

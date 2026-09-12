import type { Quad, Raster } from './image.ts'

/**
 * Perspective warp: takes the four corners of a card as it appears in the frame
 * and produces a flat, upright, fixed-size image of that card.
 *
 * This is the highest-leverage step in the pipeline. A phone is never held square
 * to a card on a table, so the raw frame varies in scale, rotation *and*
 * perspective — three nuisance parameters that any matcher would otherwise have
 * to be invariant to. Removing them geometrically, once, means everything
 * downstream can be a cheap fixed-grid comparison instead of a keypoint search.
 * It is also why this pipeline needs no SIFT/ORB-style descriptor and therefore
 * no OpenCV.js: the 8 MB dependency mostly exists to buy invariances that a
 * homography just deletes.
 */

/**
 * Solves the 3x3 homography taking `from` to `to`, with h22 fixed at 1.
 *
 * Eight unknowns from four point correspondences, by direct linear transform and
 * Gaussian elimination with partial pivoting. Returns null when the system is
 * singular, which is what a degenerate quad (three collinear corners) produces —
 * the caller treats that as "no card found" rather than warping garbage.
 */
export function solveHomography(from: Quad, to: Quad): Float64Array | null {
  const m = new Float64Array(8 * 9)

  for (let i = 0; i < 4; i++) {
    const [x, y] = from[i]
    const [u, v] = to[i]
    const r0 = i * 2 * 9
    const r1 = (i * 2 + 1) * 9

    m[r0] = x; m[r0 + 1] = y; m[r0 + 2] = 1
    m[r0 + 6] = -u * x; m[r0 + 7] = -u * y; m[r0 + 8] = u

    m[r1 + 3] = x; m[r1 + 4] = y; m[r1 + 5] = 1
    m[r1 + 6] = -v * x; m[r1 + 7] = -v * y; m[r1 + 8] = v
  }

  for (let col = 0; col < 8; col++) {
    // Partial pivoting. Without it a quad whose top edge is exactly horizontal —
    // i.e. the common case of a card lying square to the camera — puts a zero on
    // the diagonal and the solve fails on precisely the easiest input.
    let pivot = col
    for (let r = col + 1; r < 8; r++)
      if (Math.abs(m[r * 9 + col]) > Math.abs(m[pivot * 9 + col])) pivot = r

    if (Math.abs(m[pivot * 9 + col]) < 1e-10) return null

    if (pivot !== col)
      for (let c = col; c < 9; c++) {
        const t = m[col * 9 + c]
        m[col * 9 + c] = m[pivot * 9 + c]
        m[pivot * 9 + c] = t
      }

    const diag = m[col * 9 + col]
    for (let c = col; c < 9; c++) m[col * 9 + c] /= diag

    for (let r = 0; r < 8; r++) {
      if (r === col) continue
      const factor = m[r * 9 + col]
      if (factor === 0) continue
      for (let c = col; c < 9; c++) m[r * 9 + c] -= factor * m[col * 9 + c]
    }
  }

  const h = new Float64Array(9)
  for (let i = 0; i < 8; i++) h[i] = m[i * 9 + 8]
  h[8] = 1
  return h
}

/**
 * Warps the region bounded by `quad` onto a `width` x `height` raster.
 *
 * Runs backwards — for each *output* pixel, find where it came from in the input
 * and sample there. Mapping forwards would scatter input pixels across the output
 * and leave holes wherever the card is magnified. Sampling is bilinear, which
 * matters more than it looks: the descriptor's area-averaging assumes a smooth
 * input, and nearest-neighbour sampling here would alias the print's texture into
 * the 16x16 grid as false structure.
 *
 * Out-of-bounds samples come back transparent, so a quad that runs off the edge
 * of the frame degrades gracefully instead of wrapping.
 */
export function warpQuad(
  source: Raster,
  quad: Quad,
  width: number,
  height: number,
): Raster | null {
  const dst: Quad = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ]
  // Solved in the direction we actually sample: output coordinates to input
  // coordinates. Solving the intuitive direction and inverting the matrix would
  // be the same map with an extra step and worse conditioning.
  const h = solveHomography(dst, quad)
  if (!h) return null

  const out = new Uint8ClampedArray(width * height * 4)
  const { data, width: sw, height: sh } = source

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x + 0.5
      const py = y + 0.5
      const w = h[6] * px + h[7] * py + h[8]
      if (w === 0) continue
      const sx = (h[0] * px + h[1] * py + h[2]) / w
      const sy = (h[3] * px + h[4] * py + h[5]) / w

      const x0 = Math.floor(sx)
      const y0 = Math.floor(sy)
      if (x0 < 0 || y0 < 0 || x0 + 1 >= sw || y0 + 1 >= sh) continue

      const fx = sx - x0
      const fy = sy - y0
      const w00 = (1 - fx) * (1 - fy)
      const w10 = fx * (1 - fy)
      const w01 = (1 - fx) * fy
      const w11 = fx * fy

      const i00 = (y0 * sw + x0) * 4
      const i10 = i00 + 4
      const i01 = i00 + sw * 4
      const i11 = i01 + 4
      const o = (y * width + x) * 4

      for (let c = 0; c < 3; c++)
        out[o + c] =
          data[i00 + c] * w00 +
          data[i10 + c] * w10 +
          data[i01 + c] * w01 +
          data[i11 + c] * w11
      out[o + 3] = 255
    }
  }

  return { data: out, width, height }
}

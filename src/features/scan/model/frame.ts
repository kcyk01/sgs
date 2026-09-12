import type { Raster, Rect } from '../pipeline/image.ts'

/**
 * The browser half of the scanner: turning a live `<video>` into the plain pixel
 * buffer `pipeline/` works on, and working out which part of the frame the user
 * is actually being asked to aim at.
 *
 * This is the only file in the feature that touches the DOM. Everything it hands
 * downstream is a `Raster`, which is what lets the same pipeline run under Node
 * in the eval harness.
 */

/**
 * Resolution the search region is captured at.
 *
 * The corner search runs at 128px wide and the warp output is 200px, so anything
 * beyond ~320 is thrown away immediately. Capturing small is most of what keeps a
 * frame cheap: `drawImage` does the downscale on the GPU, so the expensive
 * per-pixel JavaScript downstream only ever sees a small buffer.
 */
const CAPTURE_WIDTH = 320

/**
 * Geometry of the alignment reticle, mirroring `.scan__viewport` and
 * `.scan__reticle` in styles/components.css.
 *
 * These numbers are duplicated from CSS and must be changed in both places
 * together. The alternative — measuring the live elements with
 * `getBoundingClientRect` — reads layout on every sampled frame and still has to
 * undo `object-fit: cover` by hand, so it trades a comment for a reflow without
 * removing the coupling.
 */
const VIEWPORT_ASPECT = 3 / 4
const RETICLE_INSET_X = 0.18
const RETICLE_INSET_Y = 0.12

/**
 * Extra margin around the reticle included in the search region.
 *
 * The corner detector needs to *see* the card's edges, and a user who aligns
 * their card generously will push those edges just outside the guide. Searching a
 * slightly larger area than the one drawn on screen means the common,
 * well-intentioned framing error still detects, instead of clipping the card and
 * falling back to an unrectified crop.
 */
const SEARCH_MARGIN = 0.06

/**
 * The part of a source frame the reticle covers, in source pixels.
 *
 * Has to account for `object-fit: cover`: the viewport is 3:4 but the camera is
 * not, so the browser centre-crops the video before displaying it and the user
 * only ever sees part of the frame. Ignoring that would search a region offset
 * from the one drawn over the preview — the scanner would be looking somewhere
 * other than where it is telling the user to put the card.
 */
export function reticleRegion(sourceWidth: number, sourceHeight: number): Rect {
  const sourceAspect = sourceWidth / sourceHeight

  // The largest 3:4 rectangle that fits, centred — what `cover` leaves visible.
  const visibleWidth =
    sourceAspect > VIEWPORT_ASPECT ? sourceHeight * VIEWPORT_ASPECT : sourceWidth
  const visibleHeight =
    sourceAspect > VIEWPORT_ASPECT ? sourceHeight : sourceWidth / VIEWPORT_ASPECT
  const visibleX = (sourceWidth - visibleWidth) / 2
  const visibleY = (sourceHeight - visibleHeight) / 2

  const insetX = RETICLE_INSET_X - SEARCH_MARGIN
  const insetY = RETICLE_INSET_Y - SEARCH_MARGIN

  return {
    x: visibleX + insetX * visibleWidth,
    y: visibleY + insetY * visibleHeight,
    width: (1 - 2 * insetX) * visibleWidth,
    height: (1 - 2 * insetY) * visibleHeight,
  }
}

/** Intrinsic pixel dimensions of whatever the camera or canvas handed us. */
function sourceSize(source: CanvasImageSource): { width: number; height: number } | null {
  if (source instanceof HTMLVideoElement)
    return { width: source.videoWidth, height: source.videoHeight }
  if (source instanceof HTMLImageElement)
    return { width: source.naturalWidth, height: source.naturalHeight }
  if (
    source instanceof HTMLCanvasElement ||
    (typeof OffscreenCanvas !== 'undefined' && source instanceof OffscreenCanvas) ||
    source instanceof ImageBitmap
  )
    return { width: source.width, height: source.height }
  return null
}

/**
 * Creates a reusable capture surface.
 *
 * One canvas for the life of the scanner rather than one per frame: allocating a
 * canvas 4 times a second churns GPU-backed memory and, on Safari, is a reliable
 * way to get the whole page throttled. `willReadFrequently` tells the browser to
 * keep the backing store somewhere `getImageData` can reach cheaply, which is the
 * one thing this canvas exists to do.
 */
export function createCapture(): {
  capture(source: CanvasImageSource): Raster | null
} {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })

  return {
    capture(source) {
      const size = sourceSize(source)
      if (!context || !size || size.width === 0 || size.height === 0) return null

      const region = reticleRegion(size.width, size.height)
      const width = Math.min(CAPTURE_WIDTH, Math.round(region.width))
      const height = Math.max(1, Math.round((region.height / region.width) * width))

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }

      // Crop and downscale in one `drawImage`, so the only per-pixel JavaScript
      // in the whole capture path is the `getImageData` copy itself.
      context.drawImage(
        source,
        region.x,
        region.y,
        region.width,
        region.height,
        0,
        0,
        width,
        height,
      )

      const image = context.getImageData(0, 0, width, height)
      return { data: image.data, width: image.width, height: image.height }
    },
  }
}

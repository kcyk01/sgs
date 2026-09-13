import type { Raster, Rect } from '../pipeline/image.ts'
import { CAPTURE_WIDTH, CARD_ASPECT } from '../pipeline/rectify.ts'

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
 * Geometry of the alignment reticle, mirroring `.scan__viewport` and
 * `.scan__reticle` in styles/components.css.
 *
 * `VIEWPORT_ASPECT` and `RETICLE_HEIGHT` are authored in both places and must be
 * changed in both. Everything else is *derived* from them and from
 * `CARD_ASPECT` — by the same rule on each side — so the guide drawn on screen
 * and the region searched for a card cannot drift into different shapes.
 *
 * The alternative — measuring the live elements with `getBoundingClientRect` —
 * reads layout during capture and still has to undo `object-fit: cover` by hand,
 * so it trades a comment for a reflow without removing the coupling.
 */
const VIEWPORT_ASPECT = 3 / 4

/** Reticle height as a fraction of the viewport. The `height: 76%` in the CSS. */
const RETICLE_HEIGHT = 0.76

const RETICLE_INSET_Y = (1 - RETICLE_HEIGHT) / 2

/**
 * Horizontal inset, derived from the card's real proportions rather than picked.
 *
 * The guide is card-shaped on purpose. People line a card up against the edges
 * they are shown, so a guide that is not a card's shape teaches them to frame it
 * wrong — and the previous fixed 18% inset made a guide of aspect 0.63 against a
 * card's 0.716, narrow enough that a correctly-followed guide pushed the card's
 * long edges roughly 4% of the frame outside it on each side.
 */
const RETICLE_INSET_X = (1 - (RETICLE_HEIGHT * CARD_ASPECT) / VIEWPORT_ASPECT) / 2

/**
 * Extra margin around the reticle included in the search region.
 *
 * The corner detector needs to *see* the card's edges: a card filling the guide
 * exactly would have its edges land on the crop boundary, where there is no
 * background to find a gradient against. This is pure slack for imperfect
 * alignment now that the guide is card-shaped — it used to be silently
 * compensating for the shape mismatch as well, which is most of what it was
 * spent on.
 */
const SEARCH_MARGIN = -0.03

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
 * One canvas for the life of the scanner rather than one per capture: the page
 * allows retaking freely, and churning GPU-backed canvases is a reliable way to
 * get a Safari tab throttled. `willReadFrequently` tells the browser to keep the
 * backing store somewhere `getImageData` can reach cheaply, which is the one
 * thing this canvas exists to do.
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

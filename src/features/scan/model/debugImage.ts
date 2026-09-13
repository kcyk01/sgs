import type { Quad, Raster } from '../pipeline/image.ts'

/**
 * Turning the pipeline's intermediates back into something a browser can show
 * and a user can save. Used only by Debug Mode on the scan page.
 *
 * The second DOM-aware file in the feature, alongside `frame.ts`. The split is
 * by direction rather than by subject: `frame.ts` goes from the page into the
 * pipeline (video -> pixels), this goes from the pipeline back out to the page
 * (pixels -> canvas -> file). Neither is imported by `pipeline/`, which is what
 * keeps that half runnable under Node in the eval harness.
 */

/**
 * The reticle's colour, literal because a canvas cannot read a custom property.
 * Keep in step with `--c-accent` in styles/global.css: the point of the overlay
 * is to be read against the guide the user was just aiming at.
 */
const ACCENT = '#ffb454'

/** A `Raster` as a canvas, at its own pixel dimensions. */
export function rasterToCanvas(raster: Raster): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = raster.width
  canvas.height = raster.height

  const context = canvas.getContext('2d')
  if (context) {
    // Via `createImageData` + `set` rather than `new ImageData(raster.data, ...)`:
    // a `Raster` may be backed by any ArrayBufferLike — including the
    // SharedArrayBuffer a worker could hand over — which the ImageData
    // constructor does not accept. The copy also detaches this canvas from the
    // pipeline's buffer, so holding a debug image cannot pin it alive.
    const image = context.createImageData(raster.width, raster.height)
    image.data.set(raster.data)
    context.putImageData(image, 0, 0)
  }

  return canvas
}

/**
 * Draws a detected quad over a canvas holding the region it was found in.
 *
 * Corners are numbered because their *order* is load-bearing downstream —
 * `warpQuad` maps them TL, TR, BR, BL onto a canonical card, so a quad that
 * traces the right four points in the wrong order produces a rotated or mirrored
 * card while every gate in `isPlausibleCard` still passes. A plain outline would
 * look correct in exactly that case.
 *
 * Line widths scale with the image so the overlay stays legible on a 480px
 * region viewed on a phone.
 */
export function drawQuad(canvas: HTMLCanvasElement, quad: Quad): void {
  const context = canvas.getContext('2d')
  if (!context) return

  const unit = Math.max(1, canvas.width / 240)

  context.beginPath()
  quad.forEach(([x, y], i) => (i === 0 ? context.moveTo(x, y) : context.lineTo(x, y)))
  context.closePath()

  // Dark casing under a bright stroke: the region behind this is a photograph,
  // and a single-colour outline disappears into whichever part of it happens to
  // match. Two passes cost nothing and survive any background.
  context.lineJoin = 'round'
  context.strokeStyle = 'rgba(0, 0, 0, 0.65)'
  context.lineWidth = unit * 3
  context.stroke()
  context.strokeStyle = ACCENT
  context.lineWidth = unit
  context.stroke()

  context.font = `${unit * 7}px system-ui, sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  quad.forEach(([x, y], i) => {
    context.beginPath()
    context.arc(x, y, unit * 5, 0, Math.PI * 2)
    context.fillStyle = ACCENT
    context.fill()
    context.fillStyle = '#000'
    context.fillText(String(i + 1), x, y)
  })
}

/**
 * Saves a canvas as a PNG.
 *
 * PNG rather than JPEG on purpose: these images are eval inputs, and JPEG would
 * add compression artefacts to the very edges the corner detector thresholds —
 * the harness would then be measuring the detector against noise the app never
 * produced.
 */
export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    // Safari needs the URL to outlive the synchronous click handler.
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }, 'image/png')
}

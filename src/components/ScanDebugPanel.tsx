import { useEffect, useRef } from 'react'
import {
  downloadCanvas,
  drawQuad,
  rasterToCanvas,
} from '../features/scan/model/debugImage'
import {
  CARD_ASPECT,
  DETECT_WIDTH,
  EDGE_PERCENTILE,
  MIN_EDGE_POINTS,
  quadMetrics,
} from '../features/scan/pipeline/rectify'
import type { Quad, Raster } from '../features/scan/pipeline/image'
import type { ScanDebug, ScanPass } from '../features/scan/types'

/**
 * What the scanner saw, between the shutter and the ranking.
 *
 * Exists to make `test-images/` honest. The eval harness treats any portrait
 * photo as *already being the search region*, so a loose handheld shot is
 * measured against clutter the app would have cropped away — which is what cost
 * yu-ji.png its match. A region downloaded from here was produced by the app's
 * own `reticleRegion()`, so dropping it into `test-images/` measures the real
 * thing.
 *
 * Everything shown is what the matcher scored, not a re-run: see `inspect` in
 * features/scan/model/localRecognizer.ts.
 */

/** A raster, painted once per change, with a button that saves it as a PNG. */
function DebugFigure({
  raster,
  quad,
  caption,
  filename,
  pixelated = false,
}: {
  raster: Raster
  /** Drawn over the image when present. */
  quad?: Quad | null
  caption: string
  filename: string
  /**
   * Set for the corner search's images, which are 128px wide and get blown up to
   * the panel's width. Smoothing them would invent detail the detector never
   * had, and the coarseness is half the point: an edge point is one of ~22k
   * pixels, so an outlier that drags a corner is a single visible square.
   */
  pixelated?: boolean
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Built imperatively rather than as JSX: the pixels come from an ImageData,
  // which React has no way to express as props, and rebuilding on every render
  // would repaint a photograph for every unrelated state change on the page.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const canvas = rasterToCanvas(raster)
    if (quad) drawQuad(canvas, quad)
    canvas.className = pixelated
      ? 'scan__debug-canvas scan__debug-canvas--pixels'
      : 'scan__debug-canvas'
    canvasRef.current = canvas
    host.replaceChildren(canvas)

    return () => {
      host.replaceChildren()
      canvasRef.current = null
    }
  }, [raster, quad, pixelated])

  return (
    <figure className="scan__debug-figure">
      <div ref={hostRef} />
      <figcaption className="scan__debug-caption">
        <span>
          {caption}{' '}
          <span className="muted">
            {raster.width}×{raster.height}
          </span>
        </span>
        <button
          type="button"
          className="btn scan__debug-save"
          onClick={() => canvasRef.current && downloadCanvas(canvasRef.current, filename)}
        >
          Save {filename}
        </button>
      </figcaption>
    </figure>
  )
}

/**
 * One geometry pass: the stats it produced, and every image it passed through.
 *
 * Captioned by mode rather than by `detected` alone, because the two paths mean
 * different things by a quad — `detect` found one and could have found the
 * wrong thing, `framed` assumed one and cannot have. A caption that said
 * "detected corners" over an assumed rectangle would invite exactly the wrong
 * conclusion from a correct picture.
 */
function DebugPass({
  pass,
  region,
  stem,
}: {
  pass: ScanPass
  /** The pixels every pass was handed — shared, so it is a prop, not a field. */
  region: Raster
  stem: string
}) {
  const { mode, quad, card, detected, trace } = pass
  const metrics = quad ? quadMetrics(quad, region) : null
  const assumed = mode === 'framed'

  return (
    <section className="scan__debug-pass">
      <h3 className="scan__debug-subheading">
        {assumed ? 'Framed pass — corner search skipped' : 'Detect pass — corner search'}
      </h3>

      {/* The same numbers `npm run scan:eval -- --explain` prints under GEOMETRY,
          from the same `quadMetrics` the detector's own gates use — so what is
          read here cannot disagree with what was actually applied. */}
      <dl className="scan__debug-stats">
        <dt>Quad</dt>
        <dd>
          {assumed
            ? 'assumed — the region itself, inset by FRAMED_INSET'
            : detected
              ? 'detected'
              : 'not found — using the region as the card'}
        </dd>
        {trace && (
          <>
            <dt>Edge points</dt>
            <dd>
              {trace.pointCount} above {trace.threshold.toFixed(1)}{' '}
              <span className="muted">
                (top {((1 - EDGE_PERCENTILE) * 100).toFixed(0)}% of gradients; under{' '}
                {MIN_EDGE_POINTS} the search gives up)
              </span>
            </dd>
          </>
        )}
        {metrics && (
          <>
            <dt>Fills</dt>
            <dd>{(metrics.areaFraction * 100).toFixed(1)}% of the region</dd>
            <dt>Aspect</dt>
            <dd>
              {metrics.aspect.toFixed(3)}{' '}
              <span className="muted">(a card square-on is {CARD_ASPECT.toFixed(3)})</span>
            </dd>
            <dt>Corners</dt>
            <dd>
              {quad
                ?.map(([x, y]: readonly [number, number]) => `(${Math.round(x)},${Math.round(y)})`)
                .join(' ')}
            </dd>
          </>
        )}
      </dl>

      {/* The corner search, in the order it runs, between the region it was handed
          and the quad it came out with. All three are at `DETECT_WIDTH`, which is
          the resolution the detector actually reasons at — showing them at the
          capture's 480px would flatter it. */}
      {trace && (
        <>
          <DebugFigure
            raster={trace.gray}
            pixelated
            caption={`Grayscale at ${DETECT_WIDTH}px — the image the Sobel ran on.`}
            filename={`debug-${stem}-${mode}-gray.png`}
          />
          <DebugFigure
            raster={trace.edges}
            pixelated
            caption="Sobel magnitude, scaled to this frame's strongest gradient."
            filename={`debug-${stem}-${mode}-edges.png`}
          />
          <DebugFigure
            raster={trace.points}
            pixelated
            caption="Edge points, before the corners are taken. Anything lit here can become a corner."
            filename={`debug-${stem}-${mode}-points.png`}
          />
        </>
      )}
      <DebugFigure
        raster={region}
        quad={quad}
        caption={
          assumed
            ? 'Assumed corners. Whatever is outside this is thrown away unseen.'
            : detected
              ? 'Detected corners. Should trace the card, not the background.'
              : 'No corners found — nothing to draw.'
        }
        filename={`debug-${stem}-${mode}-quad.png`}
      />
      <DebugFigure
        raster={card}
        caption={
          assumed
            ? 'Scaled card — the region, unwarped, at card size.'
            : detected
              ? 'Flattened card — what the descriptor saw.'
              : 'Fallback: the region used unflattened.'
        }
        filename={`debug-${stem}-${mode}-card.png`}
      />
    </section>
  )
}

export function ScanDebugPanel({ debug, stem }: { debug: ScanDebug; stem: string }) {
  return (
    <section className="scan__debug">
      <h2 className="scan__debug-heading">Debug</h2>

      {/* Only the region is named so the eval harness will pick it up. Its
          `resolveLabel` splits a filename on the first dot, so `<id>.quad.png`
          would resolve to `<id>` and be scanned as though it were a photo of a
          card — the `debug-` prefix keeps the diagnostics out of the numbers. */}
      <DebugFigure
        raster={debug.region}
        caption="Reticle region — the pixels searched. Drop this into test-images/."
        filename={`${stem}.png`}
      />

      {/* Every pass, in the order they were fused. Both are shown even when they
          agree: the interesting case is the one where the fused answer is wrong,
          and that is only readable against the pass that produced it. */}
      {debug.passes.map((pass) => (
        <DebugPass key={pass.mode} pass={pass} region={debug.region} stem={stem} />
      ))}
    </section>
  )
}

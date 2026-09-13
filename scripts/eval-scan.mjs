/**
 * Measures the card scanner against real photographs.
 *
 * This is the decision gate for the whole feature. The pipeline is built from
 * cheap, hand-written parts on the argument that a closed roster with one clean
 * reference image per card does not need a trained model — and that argument is
 * only worth anything if it is checked. Run this, read the recall, and let the
 * numbers say whether to ship it, tune it, or replace the descriptor with a
 * learned embedding.
 *
 *   npm run scan:eval
 *   npm run scan:eval -- --sweep             try a range of artwork windows
 *   npm run scan:eval -- --in photos         read from somewhere else
 *   npm run scan:eval -- --explain jiang-wei why did this one not match?
 *   npm run scan:eval -- --reticle           photos are whole camera frames
 *
 * `--explain` takes a character id or a filename and dumps every intermediate
 * for that photo — corner detection, the flattened card as a PNG, descriptor
 * health, the full ranking with per-window scores, and whether the reference art
 * is cropped like the rest of the roster. Read it top-down: it is ordered by
 * where things can go wrong, and an early failure makes everything after it
 * meaningless.
 *
 * ## Getting the photos
 *
 * Put them in `eval-photos/`, named after the character they show:
 *
 *   eval-photos/liu-bei.glare.jpg   a note after the first dot
 *   eval-photos/liu-bei-2.png       a second shot, numbered
 *   eval-photos/cao-ren-2.png       an alternate printing, by its art id
 *
 * All three resolve to the character; see `resolveLabel`. Aim for 5-10 shots
 * each of ~20 cards, and
 * make them *hard* on purpose — steep angles, glare across the artwork, dim
 * indoor light, a cluttered table, a card held in the hand. An eval set of
 * flat-lit photos shot straight down will report excellent numbers and tell you
 * nothing about the conditions the scanner will actually meet.
 *
 * Two kinds of photo belong here and the harness tells them apart by orientation,
 * so they can share a directory: a **whole camera frame** (landscape, 1280x720
 * from the app's own capture) is cropped to the reticle exactly as the app crops
 * it, while a shot **already cropped to the card** is portrait and is used as the
 * search region unchanged.
 * Whole frames are the more honest test — they are what the scanner actually
 * sees — and they exercise the guide geometry that a pre-cropped shot skips
 * entirely. See `isWholeFrame`.
 *
 * These are a test set, not a training set. Nothing here is fitted to them; they
 * exist to be a verdict, so resist tuning constants until this passes.
 *
 * Note the directory is not in .gitignore — photos of physical cards are yours
 * to decide about committing. A few dozen JPEGs will bloat the repo; either add
 * `eval-photos/` to .gitignore or keep them downscaled.
 */
import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import sharp from 'sharp'

import {
  describe,
  describeWindows,
  decodeDescriptor,
  similarity,
} from '../src/features/scan/pipeline/descriptor.ts'
import {
  resampleGray,
  sobelMagnitude,
  toGray,
} from '../src/features/scan/pipeline/image.ts'
import { warpQuad } from '../src/features/scan/pipeline/homography.ts'
import { matchDescriptor } from '../src/features/scan/pipeline/match.ts'
import {
  ART_WINDOWS,
  CAPTURE_WIDTH,
  CARD_HEIGHT,
  CARD_WIDTH,
  DETECT_WIDTH,
  EDGE_PERCENTILE,
  artWindowRect,
  detectCardQuad,
  queryWindowRects,
  rectifyCard,
} from '../src/features/scan/pipeline/rectify.ts'
import { reticleRegion } from '../src/features/scan/model/frame.ts'
import { BUILT_FROM, REFERENCE_ROWS } from '../src/features/scan/model/references.ts'

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1]
}

const inDir = path.resolve(flag('in', 'eval-photos'))
const sweep = args.includes('--sweep')
const explain = flag('explain', null)
const reticle = args.includes('--reticle')
const debugDir = path.resolve(flag('debug-out', 'eval-debug'))

/**
 * Is this photo a whole camera frame, or a shot already cropped to the card?
 *
 * Landscape means whole frame. That is not elegant, but it is the property that
 * actually holds: `useCamera` asks for 1280x720, so every frame the app captures
 * is landscape, while no photo cropped down to a single card ever is — a card is
 * taller than it is wide however it is held.
 *
 * "Close to a card's aspect ratio" is the tempting rule and it is wrong. A card
 * photographed at a steep angle is not card-shaped: sima-yi.png in the test set
 * is a tight crop at aspect 0.974, nearly square, and a shape-based rule cropped
 * it as though it were a frame and cost it six places. Tilt destroys the ratio
 * that rule depends on, and tilted cards are exactly what this is meant to
 * measure.
 *
 * The gap it leaves: a device delivering a *portrait* video track produces a
 * whole frame that is not landscape. Pass `--reticle` for those.
 */
const isWholeFrame = (width, height) => width > height

const references = REFERENCE_ROWS.map(([artId, characterId, encoded]) => ({
  artId,
  characterId,
  descriptor: decodeDescriptor(encoded),
}))

/**
 * The windows a query is described at, and their pixel rects — both derived from
 * `BUILT_FROM` rather than assumed.
 *
 * `full-card` mode has exactly one window, the card itself, so there is no
 * `ArtWindow` to name it with and `QUERY_WINDOWS` holds a single `null`. Keeping
 * that placeholder is what lets the reporting below stay index-aligned with
 * `describeWindows`' output in both modes instead of branching at every use.
 *
 * `--sweep` still passes its own window list, which only means anything in
 * `artwork` mode; in `full-card` mode every sweep row describes the same whole
 * card, which is the honest answer rather than a bug.
 */
const QUERY_WINDOWS = BUILT_FROM === 'full-card' ? [null] : ART_WINDOWS

const queryWindows = (card, windows = ART_WINDOWS) =>
  BUILT_FROM === 'full-card'
    ? queryWindowRects(card, BUILT_FROM)
    : windows.map((window) => artWindowRect(card, window))

/** One window as a row label; `full-card` mode has no edges to print. */
const fmt = (window) =>
  window
    ? `${window.left.toFixed(2)}/${window.right.toFixed(2)}/` +
      `${window.top.toFixed(2)}/${window.bottom.toFixed(2)}`
    : 'whole card'

/**
 * Where the images the descriptors were actually built from live, mirroring
 * `build-card-descriptors.mjs`.
 *
 * Hardcoding `public/cards/*.webp` here was fine while that was the only source,
 * but in `full-card` mode it reports the aspect and freshness of an image the
 * stored descriptor was never derived from — so the one check meant to catch a
 * stale descriptor would itself be reading the wrong file.
 */
const REFERENCE_DIR = BUILT_FROM === 'full-card' ? 'full-card' : 'public/cards'

const referenceFiles = new Map(
  (await readdir(REFERENCE_DIR).catch(() => []))
    .filter((f) => /\.(webp|png|jpe?g|avif)$/i.test(f))
    .map((f) => [path.basename(f, path.extname(f)), path.join(REFERENCE_DIR, f)]),
)

/**
 * Decoded at the app's own capture width, imported rather than repeated.
 * Evaluating at full photo resolution would measure a pipeline the app never
 * runs, and would flatter it: more pixels means cleaner edges for the corner
 * search than a phone actually provides.
 *
 * Whole camera frames are first cropped exactly the way the app crops one —
 * `object-fit: cover` undone, then the guide's insets — while photos already
 * cropped down to a card are used as they are, since they *are* the search
 * region and cropping them again would cut into the card. Getting this wrong is
 * not a small error: the same card goes from filling the frame to occupying 20%
 * of a 16:9 image, at a fraction of the pixels.
 */
async function loadPhoto(file) {
  // Rotate first and re-read the dimensions from the result: EXIF orientation
  // would otherwise put the crop rectangle on the wrong axis for portrait shots.
  const upright = await sharp(file).rotate().toBuffer({ resolveWithObject: true })
  let pipeline = sharp(upright.data)
  const whole = reticle || isWholeFrame(upright.info.width, upright.info.height)

  if (whole) {
    const { width, height } = upright.info
    const region = reticleRegion(width, height)
    const left = Math.max(0, Math.round(region.x))
    const top = Math.max(0, Math.round(region.y))
    pipeline = pipeline.extract({
      left,
      top,
      width: Math.min(width - left, Math.round(region.width)),
      height: Math.min(height - top, Math.round(region.height)),
    })
  }

  const { data, info } = await pipeline
    .resize({ width: CAPTURE_WIDTH, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  return {
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length),
    width: info.width,
    height: info.height,
    source: upright.info,
    cropped: whole,
  }
}

const files = (await readdir(inDir).catch(() => null))?.filter((f) =>
  /\.(jpe?g|png|webp|heic|avif)$/i.test(f),
)

if (!files) {
  console.error(
    `No photo directory at ${path.relative(process.cwd(), inDir)}.\n` +
      `Create it and add shots named <character-id>.<note>.jpg — see the ` +
      `comment at the top of this script.`,
  )
  process.exit(1)
}

if (files.length === 0) {
  console.error(`No photos in ${path.relative(process.cwd(), inDir)}.`)
  process.exit(1)
}

const known = new Set(references.map((r) => r.characterId))
const artToCharacter = new Map(references.map((r) => [r.artId, r.characterId]))

/**
 * Works out which character a photo is supposed to match, from its filename.
 *
 * Three ways in, because the names that come naturally are not the one name the
 * matcher thinks in:
 *
 *   liu-bei.glare.jpg -> liu-bei     the documented convention
 *   liu-bei-2.png     -> liu-bei     an alternate printing, named by its art id
 *   jiang-wei-2.png   -> jiang-wei   a second photo, numbered the obvious way
 *
 * The last two are indistinguishable by inspection and both want the same
 * answer — the character — so they resolve the same way. Guessing here beats
 * being strict: the failure mode of strictness was silently ignoring a photo
 * someone had just gone to the trouble of taking.
 */
function resolveLabel(file) {
  const stem = path.basename(file).split('.')[0]
  if (known.has(stem)) return stem
  const character = artToCharacter.get(stem)
  if (character) return character
  const trimmed = stem.replace(/-\d+$/, '')
  return known.has(trimmed) ? trimmed : null
}

const photos = []
const unknown = []

for (const file of files) {
  const label = resolveLabel(file)
  if (label) photos.push({ file, label })
  else unknown.push(file)
}

if (photos.length === 0) {
  console.error(
    `None of the ${files.length} photo(s) are named after a known character id.`,
  )
  process.exit(1)
}

/** Flattens every photo once; the window search then runs over the cached cards. */
async function flattenAll() {
  const cards = []
  for (const { file, label } of photos) {
    const region = await loadPhoto(path.join(inDir, file))
    const { card, detected } = rectifyCard(region)
    cards.push({ file, label, card, detected })
  }
  return cards
}

/** Runs the matcher over a given set of artwork windows. */
function evaluate(cards, windows) {
  const results = cards.map(({ file, label, card, detected }) => {
    const ranked = matchDescriptor(
      describeWindows(card, queryWindows(card, windows)),
      references,
    )
    return {
      file,
      label,
      detected,
      ranked,
      rank: ranked.findIndex((c) => c.characterId === label),
    }
  })

  const top1 = results.filter((r) => r.rank === 0).length / results.length
  const top5 = results.filter((r) => r.rank >= 0 && r.rank < 5).length / results.length
  const detectRate = results.filter((r) => r.detected).length / results.length
  return { results, top1, top5, detectRate }
}

const pct = (n) => `${(n * 100).toFixed(1)}%`

/**
 * Everything known about why one photo matched what it did.
 *
 * Deliberately lives here rather than as `console.log`s inside `pipeline/`:
 * debug output in the shipped code would have to be stripped, guarded or
 * shipped, and all three are worse than reassembling the same numbers out here
 * from the pipeline's own exported pieces. Nothing below reimplements pipeline
 * logic — it re-runs it and reports the intermediates.
 *
 * Reads top-down as the order things can go wrong: did we find the card, did we
 * get a usable image of it, did the descriptor separate it, and is the reference
 * we are matching against even the right shape.
 */
/**
 * Debug filename for a photo, keeping its extension.
 *
 * `jiang-wei.png` and `jiang-wei.jpg` are two different photos of one card and
 * both are worth looking at, so dropping the extension would have the second
 * silently overwrite the first — and you would be staring at the wrong image
 * while reading the right numbers.
 */
const debugName = (file) => path.basename(file).replace(/\./g, '_')

/** Writes a `Raster` out as a PNG under the debug directory. */
const writeRaster = (raster, name) =>
  sharp(Buffer.from(raster.data.buffer, raster.data.byteOffset, raster.data.length), {
    raw: { width: raster.width, height: raster.height, channels: 4 },
  })
    .png()
    .toFile(path.join(debugDir, name))

async function explainPhoto({ file, label }) {
  const region = await loadPhoto(path.join(inDir, file))
  const meta = await sharp(path.join(inDir, file)).metadata()
  const wanted = references.filter((r) => r.characterId === label)

  console.log(`\n${'='.repeat(66)}\n${file}  —  want "${label}"\n${'='.repeat(66)}`)
  console.log(
    `\nSOURCE\n  photo ${meta.width}x${meta.height} -> search region ` +
      `${region.width}x${region.height} (CAPTURE_WIDTH ${CAPTURE_WIDTH})`,
  )
  console.log(
    `  ${
      region.cropped
        ? 'whole camera frame, cropped to the reticle the way the app does'
        : 'already card-shaped, used as the search region unchanged'
    }`,
  )

  // The search region as an image. This is the most useful artefact when the
  // question is "what is the scanner actually looking at": the app crops to the
  // guide before anything else runs, so a card clipped here cannot be recognised
  // however good the descriptor is.
  await writeRaster(region, `${debugName(file)}.region.png`)
  console.log(
    `  wrote ${path.relative(process.cwd(), path.join(debugDir, `${debugName(file)}.region.png`))}` +
      ` — the whole card should sit inside this, with a margin to spare.`,
  )

  // --- 1. Geometry: did the corner search find the card, or something else? ---
  const quad = detectCardQuad(region)
  console.log(`\nGEOMETRY\n  quad detected: ${quad ? 'yes' : 'NO — fell back to the raw region'}`)

  // Re-derive the edge cloud the detector thresholds, to show how much of the
  // region looks like an edge. A cluttered background shows up here as a high
  // count spread over the whole frame rather than concentrated on a card.
  const dw = DETECT_WIDTH
  const dh = Math.max(1, Math.round(region.height / (region.width / dw)))
  const edges = sobelMagnitude(
    resampleGray(toGray(region), region.width, region.height, dw, dh),
    dw,
    dh,
  )
  const sorted = Float32Array.from(edges).sort()
  const threshold = sorted[Math.floor(sorted.length * EDGE_PERCENTILE)]
  let edgeCount = 0
  let minX = dw
  let maxX = 0
  let minY = dh
  let maxY = 0
  for (let y = 0; y < dh; y++)
    for (let x = 0; x < dw; x++)
      if (edges[y * dw + x] >= threshold) {
        edgeCount++
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
  console.log(
    `  edge pixels: ${edgeCount} of ${dw * dh} above the ${EDGE_PERCENTILE} percentile\n` +
      `  edge cloud spans x ${(minX / dw * 100).toFixed(0)}-${(maxX / dw * 100).toFixed(0)}%, ` +
      `y ${(minY / dh * 100).toFixed(0)}-${(maxY / dh * 100).toFixed(0)}% of the region\n` +
      `    (a cloud filling ~100% in both axes means the detector is seeing\n` +
      `     background, not a card sitting inside the frame)`,
  )

  if (quad) {
    let area = 0
    for (let i = 0; i < 4; i++) {
      const [x0, y0] = quad[i]
      const [x1, y1] = quad[(i + 1) % 4]
      area += x0 * y1 - x1 * y0
    }
    area = Math.abs(area) / 2
    const side = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
    const top = side(quad[0], quad[1])
    const right = side(quad[1], quad[2])
    const bottom = side(quad[2], quad[3])
    const left = side(quad[3], quad[0])
    console.log(
      `  corners: ${quad.map(([x, y]) => `(${x.toFixed(0)},${y.toFixed(0)})`).join(' ')}\n` +
        `  fills ${pct(area / (region.width * region.height))} of the region (gate: >=20%)\n` +
        `  detected aspect: ${(((top + bottom) / 2) / ((left + right) / 2)).toFixed(3)} ` +
        `(gate: 0.45-1.05, a real card is 0.716)\n` +
        `  side lengths: top ${top.toFixed(0)} right ${right.toFixed(0)} ` +
        `bottom ${bottom.toFixed(0)} left ${left.toFixed(0)}`,
    )
  }

  const card = quad ? warpQuad(region, quad, CARD_WIDTH, CARD_HEIGHT) : null
  const flattened = card ?? region

  // --- 2. The image itself. Numbers rarely beat looking at the crop. ---
  await writeRaster(flattened, `${debugName(file)}.card.png`)
  console.log(
    `\n  wrote ${path.relative(process.cwd(), path.join(debugDir, `${debugName(file)}.card.png`))}` +
      ` — open it. If that is not a flat, upright ${label} card, nothing below matters.`,
  )

  // --- 3. Descriptor health: can this crop discriminate at all? ---
  const queries = describeWindows(flattened, queryWindows(flattened))
  const cells = resampleGray(toGray(flattened), flattened.width, flattened.height, 16, 16)
  const mean = cells.reduce((a, b) => a + b, 0) / cells.length
  const sd = Math.sqrt(cells.reduce((a, b) => a + (b - mean) ** 2, 0) / cells.length)
  const hueMass = queries[0].slice(256).reduce((a, b) => a + b, 0)
  console.log(
    `\nDESCRIPTOR\n  luma spread across the 16x16 grid: ${sd.toFixed(1)} ` +
      `(below ~5 the crop is flat and every card ties)\n` +
      `  hue mass: ${hueMass} (0 = achromatic, colour contributes nothing)`,
  )

  // --- 4. The ranking, and where the wanted card actually placed. ---
  const ranked = matchDescriptor(queries, references)
  const rank = ranked.findIndex((c) => c.characterId === label)
  console.log(
    `\nRANKING\n  ${label} placed ${rank < 0 ? 'UNRANKED' : `#${rank + 1} of ${ranked.length}`}` +
      `${rank > 0 ? `, ${(ranked[0].score - ranked[rank].score).toFixed(3)} behind the winner` : ''}`,
  )
  console.log(
    '\n  #   card                 score   luma    hue    best window ' +
      `(${BUILT_FROM === 'full-card' ? 'n/a' : 'left/right/top/bottom'})`,
  )
  const rows = [...ranked.slice(0, 5)]
  if (rank >= 5) rows.push(ranked[rank])
  for (const candidate of rows) {
    const place = ranked.indexOf(candidate) + 1
    const reference = references.find((r) => r.artId === candidate.artId)
    let best = null
    queries.forEach((query, i) => {
      const s = similarity(query, reference.descriptor)
      if (!best || s.score > best.s.score) best = { s, window: QUERY_WINDOWS[i] }
    })
    console.log(
      `  ${String(place).padStart(2)}  ${candidate.characterId.padEnd(20)} ` +
        `${candidate.score.toFixed(3)}  ${best.s.luma.toFixed(3)}  ${best.s.hue.toFixed(3)}  ` +
        `${fmt(best.window)}` +
        `${candidate.characterId === label ? '   <- wanted' : ''}`,
    )
  }

  // --- 5. How the wanted card scored, and against what. ---
  for (const reference of wanted) {
    const scores = queries.map((query, i) => ({
      window: QUERY_WINDOWS[i],
      ...similarity(query, reference.descriptor),
    }))
    scores.sort((a, b) => b.score - a.score)

    if (BUILT_FROM === 'full-card') {
      // One window, so there is no crop mismatch to expose and no spread to
      // read. What is left is the only question still worth asking: how far
      // short of the winner this reference fell, and on which half of the
      // descriptor. `similarity` scores luma and hue separately, and a card
      // losing on one is a different problem from a card losing on both.
      const best = scores[0]
      const winner = references.find((r) => r.artId === ranked[0].artId)
      const top = similarity(queries[0], winner.descriptor)
      const pad = (id) => id.padEnd(20)
      console.log(`\n  whole card vs ${reference.artId}:`)
      console.log(
        `    wanted   ${pad(reference.artId)} score ${best.score.toFixed(3)}  ` +
          `luma ${best.luma.toFixed(3)}  hue ${best.hue.toFixed(3)}\n` +
          `    winner   ${pad(ranked[0].artId)} score ${top.score.toFixed(3)}  ` +
          `luma ${top.luma.toFixed(3)}  hue ${top.hue.toFixed(3)}\n` +
          `    deficit  ${pad('')} ${'      '}${(top.score - best.score).toFixed(3)}  ` +
          `luma ${(top.luma - best.luma).toFixed(3)}  hue ${(top.hue - best.hue).toFixed(3)}`,
      )
      console.log(
        `    a deficit carried by luma points at the flattened card — glare, tilt or a\n` +
          `    bad quad. One carried by hue points at colour: white balance here, or a\n` +
          `    reference scan shot under a different light.`,
      )
      continue
    }

    console.log(`\n  all ${ART_WINDOWS.length} windows vs ${reference.artId}:`)
    for (const s of scores)
      console.log(
        `    ${fmt(s.window)}   score ${s.score.toFixed(3)} ` +
          `(luma ${s.luma.toFixed(3)}  hue ${s.hue.toFixed(3)})`,
      )
    console.log(
      `    spread ${(scores[0].score - scores[scores.length - 1].score).toFixed(3)} — a large\n` +
        `    spread with the best at an edge of the grid means ART_WINDOWS does not\n` +
        `    reach the crop this reference actually needs.`,
    )
  }

  // --- 6. Is the reference itself sane, or cropped unlike its siblings? ---
  console.log('\nREFERENCE')
  const aspects = []
  for (const row of REFERENCE_ROWS) {
    const source = referenceFiles.get(row[0])
    const m = source ? await sharp(source).metadata().catch(() => null) : null
    if (m) aspects.push(m.width / m.height)
  }
  const median = aspects.sort((a, b) => a - b)[Math.floor(aspects.length / 2)]
  for (const reference of wanted) {
    const file = referenceFiles.get(reference.artId)
    const m = file ? await sharp(file).metadata().catch(() => null) : null
    if (!m) {
      console.log(`  ${reference.artId}: NO ART FILE in ${REFERENCE_DIR}/`)
      continue
    }
    // Round-trip the reference through describe(): a low self-score would mean
    // the checked-in descriptor is stale relative to the art on disk.
    const { data, info } = await sharp(file)
      .resize({ width: CARD_WIDTH, fit: 'inside', withoutEnlargement: true })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const fresh = describe({
      data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length),
      width: info.width,
      height: info.height,
    })
    console.log(
      `  ${reference.artId}: ${m.width}x${m.height}, aspect ${(m.width / m.height).toFixed(3)} ` +
        `(roster median ${median.toFixed(3)})\n` +
        `    stored descriptor vs art on disk: ${similarity(fresh, reference.descriptor).score.toFixed(3)} ` +
        `(1.000 = in sync; lower means \`npm run descriptors\` is overdue)\n` +
        `    an aspect far from the median means this art was cropped unlike the rest,\n` +
        `    ${
          BUILT_FROM === 'full-card'
            ? 'so it is being compared against a differently-framed whole card.'
            : 'so the window that fits it may sit outside ART_WINDOWS entirely.'
        }`,
    )
  }
}

if (explain) {
  const targets = photos.filter(
    (p) => p.label === explain || path.basename(p.file) === explain,
  )
  if (targets.length === 0) {
    console.error(
      `Nothing in ${path.relative(process.cwd(), inDir)} matches "${explain}". ` +
        `Pass a character id (e.g. jiang-wei) or a filename.`,
    )
    process.exit(1)
  }
  await mkdir(debugDir, { recursive: true })
  for (const target of targets) await explainPhoto(target)
  process.exit(0)
}

const cards = await flattenAll()

if (sweep) {
  // Each window alone, then all of them together. The gap between the best
  // single row and the last line is what the search is buying — if it ever
  // closes, the reference crops have become consistent and ART_WINDOWS can
  // collapse back to one entry.
  console.log(`Artwork windows over ${photos.length} photos\n`)
  console.log('  left  right    top  bottom   top-1   top-5')
  for (const window of ART_WINDOWS) {
    const { top1, top5 } = evaluate(cards, [window])
    console.log(
      `  ${window.left.toFixed(2)}   ${window.right.toFixed(2)}   ` +
        `${window.top.toFixed(2)}    ${window.bottom.toFixed(2)}` +
        `  ${pct(top1).padStart(6)}  ${pct(top5).padStart(6)}`,
    )
  }
  const combined = evaluate(cards, ART_WINDOWS)
  console.log(
    `\n  all ${ART_WINDOWS.length} together      ` +
      `${pct(combined.top1).padStart(6)}  ${pct(combined.top5).padStart(6)}`,
  )
  process.exit(0)
}

const { results, top1, top5, detectRate } = evaluate(cards, ART_WINDOWS)

console.log(`${results.length} photos, ${new Set(photos.map((p) => p.label)).size} cards\n`)
console.log(`  top-1 recall     ${pct(top1)}`)
console.log(`  top-5 recall     ${pct(top5)}`)
console.log(`  card detected    ${pct(detectRate)}  (rest fell back to the plain crop)`)

const failures = results.filter((r) => r.rank !== 0)
if (failures.length) {
  console.log(`\n${failures.length} photo(s) did not come first:\n`)
  for (const failure of failures.slice(0, 20)) {
    const winner = failure.ranked[0]
    const place = failure.rank < 0 ? 'unranked' : `#${failure.rank + 1}`
    console.log(
      `  ${failure.file}\n` +
        `    wanted ${failure.label} (${place}), got ${winner.characterId} ` +
        `at ${winner.score.toFixed(3)}${failure.detected ? '' : ' [no quad detected]'}`,
    )
  }
  if (failures.length > 20) console.log(`  ... and ${failures.length - 20} more`)
}

if (unknown.length)
  console.log(
    `\nIgnored ${unknown.length} file(s) whose name is not a character id: ` +
      `${unknown.slice(0, 5).join(', ')}${unknown.length > 5 ? ', ...' : ''}`,
  )

// The thresholds from the design discussion, restated where they get checked.
console.log(
  `\n${
    top5 >= 0.95
      ? 'top-5 >= 95%: ship it.'
      : top5 >= 0.8
        ? 'top-5 in 80-95%: add a rerank stage before reaching for a model.'
        : 'top-5 < 80%: swap the descriptor for a learned embedding — see ' +
          'src/features/scan/pipeline/descriptor.ts.'
  }`,
)

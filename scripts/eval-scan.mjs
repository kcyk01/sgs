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
 *   npm run scan:eval -- --sweep       try a range of artwork windows
 *   npm run scan:eval -- --in photos   read from somewhere else
 *
 * ## Getting the photos
 *
 * Put them in `eval-photos/`, named `<character-id>.<anything>.<ext>`:
 *
 *   eval-photos/liu-bei.1.jpg
 *   eval-photos/liu-bei.glare.jpg
 *   eval-photos/cao-cao.dim.jpg
 *
 * The id is everything before the first dot, so it can carry dashes; the middle
 * part is a free-form note to you. Aim for 5-10 shots each of ~20 cards, and
 * make them *hard* on purpose — steep angles, glare across the artwork, dim
 * indoor light, a cluttered table, a card held in the hand. An eval set of
 * flat-lit photos shot straight down will report excellent numbers and tell you
 * nothing about the conditions the scanner will actually meet.
 *
 * These are a test set, not a training set. Nothing here is fitted to them; they
 * exist to be a verdict, so resist tuning constants until this passes.
 *
 * Note the directory is not in .gitignore — photos of physical cards are yours
 * to decide about committing. A few dozen JPEGs will bloat the repo; either add
 * `eval-photos/` to .gitignore or keep them downscaled.
 */
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import sharp from 'sharp'

import { describeWindows, decodeDescriptor } from '../src/features/scan/pipeline/descriptor.ts'
import { matchDescriptor } from '../src/features/scan/pipeline/match.ts'
import {
  ART_WINDOWS,
  CAPTURE_WIDTH,
  artWindowRects,
  rectifyCard,
} from '../src/features/scan/pipeline/rectify.ts'
import { REFERENCE_ROWS } from '../src/features/scan/model/references.ts'

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1]
}

const inDir = path.resolve(flag('in', 'eval-photos'))
const sweep = args.includes('--sweep')

const references = REFERENCE_ROWS.map(([artId, characterId, encoded]) => ({
  artId,
  characterId,
  descriptor: decodeDescriptor(encoded),
}))

/**
 * Decoded at the app's own capture width, imported rather than repeated.
 * Evaluating at full photo resolution would measure a pipeline the app never
 * runs, and would flatter it: more pixels means cleaner edges for the corner
 * search than a phone actually provides.
 */
async function loadPhoto(file) {
  const { data, info } = await sharp(file)
    .rotate() // honour EXIF orientation, or every portrait phone shot arrives sideways
    .resize({ width: CAPTURE_WIDTH, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  return {
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length),
    width: info.width,
    height: info.height,
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
const photos = []
const unknown = []

for (const file of files) {
  const label = path.basename(file).split('.')[0]
  if (known.has(label)) photos.push({ file, label })
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
    const rects = windows.map(({ inset, top, height }) => ({
      x: inset * card.width,
      y: top * card.height,
      width: (1 - 2 * inset) * card.width,
      height: Math.min(height, 1 - top) * card.height,
    }))
    const ranked = matchDescriptor(describeWindows(card, rects), references)
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
const cards = await flattenAll()

if (sweep) {
  // Each window alone, then all of them together. The gap between the best
  // single row and the last line is what the search is buying — if it ever
  // closes, the reference crops have become consistent and ART_WINDOWS can
  // collapse back to one entry.
  console.log(`Artwork windows over ${photos.length} photos\n`)
  console.log('  inset    top  height   top-1   top-5')
  for (const window of ART_WINDOWS) {
    const { top1, top5 } = evaluate(cards, [window])
    console.log(
      `  ${window.inset.toFixed(2)}   ${window.top.toFixed(2)}   ${window.height.toFixed(2)}` +
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

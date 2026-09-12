/**
 * Derives one representative colour per card and writes them out as a module
 * the app can sort by.
 *
 *   public/cards/cao-cao.webp  ->  'cao-cao': [176, 46, 34]
 *
 * Build-time only, same deal as build-card-images.mjs: it lives outside `src/`,
 * nothing imports it, and `sharp` is a devDependency. The *output* is checked
 * in, so the app never does image work at runtime.
 *
 *   npm run colors            regenerate src/data/cardColors.ts
 *   npm run colors -- --dry   print the mapping instead of writing it
 *
 * Reads `public/cards` rather than `art-source` on purpose: filenames there are
 * already card ids, and the WebP is what a user actually sees. Every card in
 * that directory is included — characters, variants and weapons alike — since
 * the mapping is keyed on id and doesn't care which kind the id belongs to.
 *
 * Flags: --in <dir> --out <file> --width <px> --dry
 */
import { readdir, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import sharp from 'sharp'

const SOURCE_EXT = /\.(webp|png|jpe?g|tiff?|avif)$/i
const CONCURRENCY = 4

/**
 * Hue resolution of the histogram. 24 bins = 15° each, which is about the
 * finest split that still lumps "red" and "slightly orange red" together —
 * the point is to find the dominant *family* of colour, not to preserve every
 * shade in the artwork.
 */
const HUE_BINS = 24

/** Pixels below this saturation have no meaningful hue (greys, parchment). */
const MIN_SAT = 0.25
/** Hue is numerically unstable in near-black and blown-out highlights. */
const MIN_VAL = 0.15
const MAX_VAL = 0.97
/**
 * If the winning hue accounts for less than this share of the image, the card
 * is genuinely desaturated (an ink-wash portrait, say) and gets its plain
 * average rather than being labelled by a stray red seal in one corner.
 */
const MIN_HUE_SHARE = 0.08

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1]
}

const inDir = path.resolve(flag('in', 'public/cards'))
const outFile = path.resolve(flag('out', 'src/data/cardColors.ts'))
// 96px wide is ~12k pixels: far more than enough to characterise a colour, and
// it keeps the whole roster under a second.
const width = Number(flag('width', 96))
const dry = args.includes('--dry')

/** Matches `slugify` in build-card-images.mjs — ids come from filenames. */
function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Hue in degrees, saturation and value, all from 0-255 channels. */
function hsv(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const c = max - min
  let h = 0
  if (c !== 0) {
    if (max === r) h = ((g - b) / c) % 6
    else if (max === g) h = (b - r) / c + 2
    else h = (r - g) / c + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max === 0 ? 0 : c / max, v: max / 255 }
}

/**
 * The card's colour as a person would describe it.
 *
 * A plain mean is useless here — average any painted illustration and you get
 * the same muddy grey-brown, so every card sorts next to every other card. So
 * instead: bin pixels by hue, weight each by how saturated it is, and let the
 * heaviest hue win. Cao Cao's red cloak beats the acres of dull sky behind it
 * even though the sky covers more canvas, which is the intuition being
 * encoded — a card's colour is its most *insistent* colour, not its most
 * common one.
 */
async function cardColor(file) {
  const { data, info } = await sharp(file)
    .resize({ width, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width: w, height: h, channels } = info
  const cx = (w - 1) / 2
  const cy = (h - 1) / 2
  const maxDist = Math.hypot(cx, cy) || 1

  // Per-bin running totals, so the winner can be re-averaged from the actual
  // pixels that voted for it rather than from the bin's nominal hue.
  const binW = new Float64Array(HUE_BINS)
  const binR = new Float64Array(HUE_BINS)
  const binG = new Float64Array(HUE_BINS)
  const binB = new Float64Array(HUE_BINS)
  let flatW = 0
  let flatR = 0
  let flatG = 0
  let flatB = 0

  for (let i = 0, p = 0; i < data.length; i += channels, p++) {
    if (data[i + 3] < 128) continue // transparent
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    // Subjects are centred and backgrounds hug the edges, so pixels near the
    // middle get up to twice the say. Gentle on purpose: this nudges ties, it
    // doesn't crop the image down to its middle.
    const x = p % w
    const y = (p - x) / w
    const center = 1 - 0.5 * (Math.hypot(x - cx, y - cy) / maxDist)

    const { h: hue, s, v } = hsv(r, g, b)

    // Every pixel feeds the plain average, which is the fallback for art with
    // no dominant hue at all.
    flatW += center
    flatR += r * center
    flatG += g * center
    flatB += b * center

    if (s < MIN_SAT || v < MIN_VAL || v > MAX_VAL) continue

    // Weighting by saturation as well as area is what stops a large wash of
    // barely-tinted background from outvoting a small vivid subject.
    const weight = center * s
    const bin = Math.min(HUE_BINS - 1, Math.floor((hue / 360) * HUE_BINS))
    binW[bin] += weight
    binR[bin] += r * weight
    binG[bin] += g * weight
    binB[bin] += b * weight
  }

  if (flatW === 0) return [0, 0, 0] // fully transparent image

  // Score each bin together with its neighbours: a hue sitting on a bin
  // boundary would otherwise split its own vote in half and lose to a weaker
  // but better-aligned rival.
  const at = (i) => binW[(i + HUE_BINS) % HUE_BINS]
  let best = -1
  let bestScore = 0
  for (let i = 0; i < HUE_BINS; i++) {
    const score = at(i - 1) * 0.5 + binW[i] + at(i + 1) * 0.5
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  }

  const flat = () => [flatR / flatW, flatG / flatW, flatB / flatW]
  if (best === -1) return flat().map(Math.round)

  // Share is measured against every pixel, not just the coloured ones: a card
  // that is 95% grey should read as grey. (Both sides carry the centre weight,
  // and the numerator carries saturation too, so this is "how much vivid colour
  // is there", not "what fraction of the canvas".)
  const window = [(best - 1 + HUE_BINS) % HUE_BINS, best, (best + 1) % HUE_BINS]
  const wSum = window.reduce((n, i) => n + binW[i], 0)
  if (wSum / flatW < MIN_HUE_SHARE) return flat().map(Math.round)

  return [
    window.reduce((n, i) => n + binR[i], 0) / wSum,
    window.reduce((n, i) => n + binG[i], 0) / wSum,
    window.reduce((n, i) => n + binB[i], 0) / wSum,
  ].map(Math.round)
}

const sources = await readdir(inDir).catch(() => null)
if (!sources) {
  console.error(`No card directory at ${path.relative(process.cwd(), inDir)}`)
  process.exit(1)
}

const files = sources.filter((f) => SOURCE_EXT.test(f))
if (files.length === 0) {
  console.log(`No images in ${path.relative(process.cwd(), inDir)}`)
  process.exit(0)
}

const entries = []
const failures = []

let cursor = 0
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, files.length) }, async () => {
    while (cursor < files.length) {
      const file = files[cursor++]
      const id = slugify(path.basename(file, path.extname(file)))
      try {
        entries.push([id, await cardColor(path.join(inDir, file))])
      } catch (err) {
        failures.push([file, err.message])
      }
    }
  }),
)

// Ordered by hue, so the generated file reads as a rainbow and a re-run diffs
// only where the art actually changed — the worker pool finishes in whatever
// order it likes, and `readdir` order is not guaranteed either.
entries.sort(([aId, a], [bId, b]) => {
  const ah = hsv(...a)
  const bh = hsv(...b)
  // Neutrals have no meaningful hue; park them at the end rather than letting
  // rounding noise scatter them through the spectrum.
  const aNeutral = ah.s < MIN_SAT
  const bNeutral = bh.s < MIN_SAT
  if (aNeutral !== bNeutral) return aNeutral ? 1 : -1
  if (aNeutral) return ah.v - bh.v || aId.localeCompare(bId)
  return ah.h - bh.h || aId.localeCompare(bId)
})

const hex = ([r, g, b]) =>
  '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')

const body = entries
  .map(([id, rgb]) => `  '${id}': [${rgb.join(', ')}], // ${hex(rgb)}`)
  .join('\n')

const module = `/**
 * One representative colour per card, as [r, g, b] (0-255).
 *
 * GENERATED by scripts/build-card-colors.mjs — do not edit by hand. Re-run
 * \`npm run colors\` after changing any art in public/cards.
 *
 * Each value is the card's dominant hue rather than its average colour: the
 * shade you'd name if asked what colour the card is. Entries are listed in hue
 * order, neutrals last. Keyed by card id, so characters, alternate versions and
 * weapons all appear here.
 */
export const cardColors: Record<string, [number, number, number]> = {
${body}
}
`

if (dry) {
  process.stdout.write(module)
} else {
  await mkdir(path.dirname(outFile), { recursive: true })
  await writeFile(outFile, module, 'utf8')
  console.log(
    `${entries.length} cards -> ${path.relative(process.cwd(), outFile)}`,
  )
}

for (const [file, message] of failures) console.error(`FAILED ${file}: ${message}`)
if (failures.length) process.exit(1)

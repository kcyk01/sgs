/**
 * Converts card scans to the WebP files the app actually serves.
 *
 *   art-source/Liu_Bei.png  ->  public/cards/liu-bei.webp
 *
 * Build-time only: this lives outside `src/`, nothing imports it, and `sharp`
 * is a devDependency — so neither the script nor its dependency can end up in
 * the bundle. The originals stay in `art-source/`, which Vite never touches.
 * (Anything left in `public/` is copied verbatim into `dist/`, which is exactly
 * why the sources must not live there.)
 *
 *   npm run images            convert anything new or changed
 *   npm run images -- --force re-encode everything
 *
 * Flags: --in <dir> --out <dir> --width <px> --quality <1-100> --force
 */
import { readdir, stat, mkdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import sharp from 'sharp'

const SOURCE_EXT = /\.(png|jpe?g|tiff?|avif|webp)$/i
/** How many images to encode at once. sharp releases the event loop, so this is
 *  roughly "use the machine" without spawning a job per file on a 500-card run. */
const CONCURRENCY = 4

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1]
}

const inDir = path.resolve(flag('in', 'art-source'))
const outDir = path.resolve(flag('out', 'public/cards'))
const width = Number(flag('width', 600))
const quality = Number(flag('quality', 85))
const force = args.includes('--force')

/**
 * Filenames become URLs and must match a card id exactly — `Character.id`,
 * `CharacterVariant.id` or `Weapon.id` — so normalise to the kebab-case the
 * rest of the codebase uses rather than trusting whatever the scanner named the
 * file.
 */
function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} kB`

async function convert(file) {
  const from = path.join(inDir, file)
  const slug = slugify(path.basename(file, path.extname(file)))
  const to = path.join(outDir, `${slug}.webp`)

  const src = await stat(from)
  if (!force) {
    // Skip work already done: only re-encode when the source is newer than the
    // output, so re-running after adding one card costs a few stat() calls.
    const prev = await stat(to).catch(() => null)
    if (prev && prev.mtimeMs >= src.mtimeMs) return { skipped: true }
  }

  const info = await sharp(from)
    // `withoutEnlargement` so a small scan is left alone rather than upscaled
    // into mush. Height follows from the source's aspect ratio — the 5:7 crop
    // is CSS's job (`object-fit: cover`), and cropping here would throw away
    // pixels the lightbox wants, since it shows the art uncropped.
    .resize({ width, withoutEnlargement: true })
    // 85 rather than the usual 75-80: card art is mostly fine printed rules
    // text, which is the first thing WebP's chroma subsampling smears.
    .webp({ quality, effort: 6 })
    .toFile(to)

  return { from: src.size, to: info.size, out: path.basename(to), slug, file }
}

const sources = await readdir(inDir).catch(() => null)
if (!sources) {
  console.error(
    `No source directory at ${path.relative(process.cwd(), inDir)}\n` +
      `Create it and drop card scans in, named after each card id.`,
  )
  process.exit(1)
}

const files = sources.filter((f) => SOURCE_EXT.test(f))
if (files.length === 0) {
  console.log(`Nothing to convert in ${path.relative(process.cwd(), inDir)}`)
  process.exit(0)
}

await mkdir(outDir, { recursive: true })

let before = 0
let after = 0
let converted = 0
let skipped = 0
const failures = []

// Fixed-size worker pool: each worker pulls the next index until the list runs
// out, so one slow image doesn't stall a whole batch the way chunking would.
let cursor = 0
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, files.length) }, async () => {
    while (cursor < files.length) {
      const file = files[cursor++]
      try {
        const r = await convert(file)
        if (r.skipped) {
          skipped++
          continue
        }
        converted++
        before += r.from
        after += r.to
        const saved = Math.round((1 - r.to / r.from) * 100)
        const renamed = r.slug !== path.basename(r.file, path.extname(r.file))
        console.log(
          `  ${r.file} -> ${r.out}  ${kb(r.from)} -> ${kb(r.to)} (-${saved}%)` +
            (renamed ? '  [renamed to match the id convention]' : ''),
        )
      } catch (err) {
        failures.push([file, err.message])
      }
    }
  }),
)

console.log(
  `\n${converted} converted, ${skipped} up to date` +
    (converted ? `  ${kb(before)} -> ${kb(after)}` : ''),
)

// Originals under public/ are copied straight into dist/, doubling the payload
// for every card. Worth saying out loud rather than leaving to be discovered in
// a bundle report.
const stale = (await readdir(outDir)).filter((f) => !/\.(webp|md)$/i.test(f))
if (stale.length) {
  console.warn(
    `\nWarning: ${stale.length} non-WebP file(s) in ${path.relative(process.cwd(), outDir)} ` +
      `will be shipped as-is by the build:\n  ${stale.join('\n  ')}`,
  )
}

for (const [file, message] of failures) console.error(`FAILED ${file}: ${message}`)
if (failures.length) process.exit(1)

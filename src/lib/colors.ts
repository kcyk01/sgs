import { cardColors } from '../data/cardColors'

/**
 * Ordering cards by the colour of their art.
 *
 * `data/cardColors.ts` gives each card one representative RGB, generated from
 * the artwork by `scripts/build-card-colors.mjs`. That's the expensive half;
 * this is the cheap half — turning a triple into a position in a rainbow.
 *
 * Sorting on RGB directly doesn't work: it's three independent axes, so a
 * dark red and a bright red end up further apart than a red and a green. Hue
 * is the axis people actually mean by "sort by colour", so that's what we sort
 * on, with colourless cards collected at the end rather than scattered through
 * the spectrum by rounding noise.
 */

/**
 * Below this saturation a card reads as grey/sepia and its hue is more or less
 * arbitrary. Deliberately not shared with the generator's own threshold: that
 * one asks "does this *pixel* have a usable hue", this one asks "is this
 * *card* colourless", and they're free to drift apart.
 */
const NEUTRAL_SAT = 0.18

interface ColorRank {
  /** Greys and sepias, sorted after everything with a real hue. */
  neutral: boolean
  /** Degrees, 0 = red. */
  hue: number
  /** 0-1 brightness, used to order neutrals and break hue ties. */
  value: number
}

function rank(id: string): ColorRank | null {
  const rgb = cardColors[id]
  if (!rgb) return null

  const [r, g, b] = rgb.map((n) => n / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const c = max - min

  let hue = 0
  if (c !== 0) {
    if (max === r) hue = ((g - b) / c) % 6
    else if (max === g) hue = (b - r) / c + 2
    else hue = (r - g) / c + 4
    hue *= 60
    if (hue < 0) hue += 360
  }

  return { neutral: (max === 0 ? 0 : c / max) < NEUTRAL_SAT, hue, value: max }
}

/**
 * Compares two card ids by art colour: reds through to violets, then neutrals
 * darkest first. Returns 0 for cards of indistinguishable colour — and for any
 * card with no generated entry — so callers can fall back to a stable tiebreak
 * of their own.
 *
 * A card missing from `cardColors` sorts last rather than first: a newly added
 * card that hasn't had `npm run colors` run for it yet shows up in an obvious
 * clump at the end, instead of silently sitting at the top of the list.
 */
export function compareCardColors(a: string, b: string): number {
  const ra = rank(a)
  const rb = rank(b)
  if (!ra || !rb) return ra ? -1 : rb ? 1 : 0
  if (ra.neutral !== rb.neutral) return ra.neutral ? 1 : -1
  if (ra.neutral) return ra.value - rb.value
  return ra.hue - rb.hue
}

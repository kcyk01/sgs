import type { Character } from '../../types/character'
import { allAbilities, characterVersions } from '../../lib/versions'
import { qun } from './qun'
import { shu } from './shu'
import { wei } from './wei'
import { wu } from './wu'

/**
 * The card database, one file per kingdom.
 *
 * Conventions for an entry:
 * - `id` is a kebab-case slug. It is the URL (`/c/<id>`) *and* the art filename
 *   (`public/cards/<id>.webp`), so it has to be unique across every kingdom.
 * - Rules text in `Ability.description` supports `[Card]` references, automatic
 *   kingdom colouring, and `\n` line breaks — see `RulesText`.
 * - `variants` are patches over the base entry; list only what differs.
 *
 * These are combined eagerly rather than lazily on purpose: the list page
 * renders and searches the whole roster on first paint, so a per-kingdom
 * dynamic import would fetch all four chunks immediately anyway, just later and
 * over more requests. What *is* split is the bundle — see `vite.config.ts`,
 * which keeps this data in its own chunk so editing a description doesn't
 * invalidate the cached app code.
 */
export const characters: Character[] = [...shu, ...wei, ...wu, ...qun]

export const characterById = new Map(characters.map((c) => [c.id, c]))

/**
 * Every ability tag present in the data, sorted — powers the ability filter UI.
 * Includes tags that only appear on an alternate version, since the filter
 * matches those too (see `filterCharacters`).
 */
export const allAbilityTags: string[] = [
  ...new Set(characters.flatMap((c) => allAbilities(c).flatMap((a) => a.tags ?? []))),
].sort()

/** Min/max health present in the data, used to bound the health filter. */
export const healthRange: { min: number; max: number } = characters.length
  ? characters.reduce(
      (acc, c) => ({
        min: Math.min(acc.min, c.health),
        max: Math.max(acc.max, c.health),
      }),
      { min: Infinity, max: -Infinity },
    )
  : { min: 0, max: 0 }

if (import.meta.env.DEV) {
  // Now that ids are spread across four files, a collision between kingdoms is
  // easy to introduce and silent: `characterById` would keep only the last
  // entry, and both cards would resolve to the same art file. Variant ids share
  // that same namespace, so they are checked together.
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const character of characters)
    for (const version of characterVersions(character)) {
      if (seen.has(version.id)) duplicates.add(version.id)
      seen.add(version.id)
    }
  if (duplicates.size)
    console.warn(
      `[characters] duplicate id(s): ${[...duplicates].join(', ')}. ` +
        `Ids must be unique across all kingdoms and variants — they are both ` +
        `the route and the card art filename.`,
    )
}

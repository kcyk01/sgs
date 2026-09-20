import type { Character } from '../../types/character'
import type { Gender } from '../../types/character'
import {
  abilityCounts,
  allAbilities,
  cardPacks,
  characterGenders,
  characterVersions,
} from '../../lib/versions'
import { genders } from '../genders'
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

/**
 * The distinct health values present in the data, ascending — the health filter
 * offers exactly these. A min/max range would invent empty options: the roster
 * runs 3, 4, 8 with nothing in between, and a chip for 5 that can never match
 * anything is worse than no chip at all.
 */
export const healthValues: number[] = [
  ...new Set(characters.map((c) => c.health)),
].sort((a, b) => a - b)

/**
 * The distinct ability counts present in the data, ascending. Same reasoning as
 * `healthValues`: offer only counts that can actually match something. Counted
 * per printing, so a character's variants can contribute counts of their own —
 * see `abilityCounts`.
 */
export const abilityCountValues: number[] = [
  ...new Set(characters.flatMap((c) => abilityCounts(c))),
].sort((a, b) => a - b)

/**
 * The card packs present in the data, alphabetically. Same reasoning as
 * `healthValues`: the filter offers only packs something can be filtered to.
 * Empty while no card carries a `cardPack`, which hides the section entirely.
 */
export const cardPackValues: string[] = [
  ...new Set(characters.flatMap((c) => cardPacks(c))),
].sort((a, b) => a.localeCompare(b))

/**
 * The genders present in the data, in `genders` declaration order. Same
 * reasoning as `healthValues` — and while no card carries one, the list is
 * empty and the filter section stays hidden.
 */
export const genderValues: Gender[] = genders
  .map((g) => g.id)
  .filter((id) => characters.some((c) => characterGenders(c).includes(id)))

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

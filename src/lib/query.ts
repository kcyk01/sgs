import type { Character, Gender } from '../types/character'
import { kingdomName } from '../data/kingdoms'
import { compareCardColors } from './colors'
import {
  abilityCounts,
  allAbilities,
  cardPacks,
  characterGenders,
} from './versions'

export type SortKey = 'name' | 'color'
export type GroupKey = 'none' | 'kingdom' | 'health'

/** Everything the list page needs to derive its contents. Serialized into the URL. */
export interface CharacterQuery {
  q: string
  kingdoms: string[]
  tags: string[]
  /** Selected health values. Empty means "any"; otherwise OR semantics. */
  healths: number[]
  /**
   * Selected ability counts — "show me the one-ability cards". Empty means
   * "any"; otherwise OR semantics, like the rest.
   */
  abilityCounts: number[]
  /**
   * Selected booster packs. Empty means "any"; otherwise OR semantics. Stored
   * as the pack name itself rather than a slug — there is no pack table to key
   * into, the names come straight off the cards.
   */
  cardPacks: string[]
  /** Selected genders. Empty means "any"; otherwise OR semantics. */
  genders: Gender[]
  sort: SortKey
  group: GroupKey
}

export const emptyQuery: CharacterQuery = {
  q: '',
  kingdoms: [],
  tags: [],
  healths: [],
  abilityCounts: [],
  cardPacks: [],
  genders: [],
  sort: 'name',
  group: 'kingdom',
}

/** Lowercase + strip diacritics so "Lu Bu" matches "Lü Bu". */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

/**
 * Free-text search across name, title, kingdom, ability name + rules text, and
 * the invisible `searchTerms` labels. Alternate versions are folded in — their
 * names, abilities and terms match the one character that carries them, rather
 * than appearing as separate results.
 */
function matchesText(character: Character, needle: string): boolean {
  if (!needle) return true
  const haystack = normalize(
    [
      character.name,
      character.title ?? '',
      kingdomName(character.kingdom),
      character.searchTerms ?? '',
      ...(character.variants ?? []).flatMap((v) => [
        v.label,
        v.name ?? '',
        v.title ?? '',
        // Additive, not an override: a variant's art labels are extra ways in,
        // and the base card's still describe a real printing.
        v.searchTerms ?? '',
      ]),
      ...allAbilities(character).flatMap((a) => [
        a.name,
        a.description,
        ...(a.tags ?? []),
      ]),
    ].join(' '),
  )
  // Every whitespace-separated term must appear, so "wei 4" narrows results.
  return normalize(needle)
    .split(/\s+/)
    .every((term) => haystack.includes(term))
}

export function filterCharacters(
  source: Character[],
  query: CharacterQuery,
): Character[] {
  const {
    q,
    kingdoms,
    tags,
    healths,
    abilityCounts: counts,
    cardPacks: packs,
    genders,
  } = query
  return source.filter((c) => {
    if (kingdoms.length && !kingdoms.includes(c.kingdom)) return false
    if (healths.length && !healths.includes(c.health)) return false
    // A character qualifies if *any* of its printings has a selected count —
    // the same "a variant is a real card too" rule the tag filter and the
    // search box already follow.
    if (counts.length && !abilityCounts(c).some((n) => counts.includes(n)))
      return false
    // Same per-printing rule: a character counts as "in" a pack if any of its
    // versions shipped in it.
    if (packs.length && !cardPacks(c).some((p) => packs.includes(p))) return false
    if (genders.length && !characterGenders(c).some((g) => genders.includes(g)))
      return false
    if (tags.length) {
      const own = new Set(allAbilities(c).flatMap((a) => a.tags ?? []))
      // OR semantics: match any selected tag.
      if (!tags.some((t) => own.has(t))) return false
    }
    return matchesText(c, q)
  })
}

export function sortCharacters(source: Character[], sort: SortKey): Character[] {
  const byName = (a: Character, b: Character) => a.name.localeCompare(b.name)
  const copy = [...source]
  switch (sort) {
    case 'color':
      // Always the base card's art, even for a character whose variants have
      // wildly different colouring — the list shows version 0, so sorting on
      // anything else would order the grid by images it isn't displaying.
      return copy.sort((a, b) => compareCardColors(a.id, b.id) || byName(a, b))
    case 'name':
    default:
      return copy.sort(byName)
  }
}

export interface CharacterGroup {
  key: string
  label: string
  items: Character[]
}

export function groupCharacters(
  source: Character[],
  group: GroupKey,
): CharacterGroup[] {
  if (group === 'none') {
    return [{ key: 'all', label: 'All characters', items: source }]
  }

  const buckets = new Map<string, Character[]>()
  for (const c of source) {
    const key = group === 'kingdom' ? c.kingdom : String(c.health)
    const bucket = buckets.get(key)
    if (bucket) bucket.push(c)
    else buckets.set(key, [c])
  }

  return [...buckets.entries()]
    .map(([key, items]) => ({
      key,
      label: group === 'kingdom' ? kingdomName(key) : `${key} health`,
      items,
    }))
    .sort((a, b) =>
      group === 'health'
        ? Number(b.key) - Number(a.key)
        : a.label.localeCompare(b.label),
    )
}

/** Count of active narrowing filters — shown as a badge on the Filter button. */
export function activeFilterCount(query: CharacterQuery): number {
  return (
    query.kingdoms.length +
    query.tags.length +
    query.healths.length +
    query.abilityCounts.length +
    query.cardPacks.length +
    query.genders.length
  )
}

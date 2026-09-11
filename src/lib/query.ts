import type { Character } from '../types/character'
import { kingdomName } from '../data/kingdoms'
import { allAbilities } from './versions'

export type SortKey = 'name' | 'health-desc' | 'health-asc'
export type GroupKey = 'none' | 'kingdom' | 'health'

/** Everything the list page needs to derive its contents. Serialized into the URL. */
export interface CharacterQuery {
  q: string
  kingdoms: string[]
  tags: string[]
  minHealth: number | null
  maxHealth: number | null
  sort: SortKey
  group: GroupKey
}

export const emptyQuery: CharacterQuery = {
  q: '',
  kingdoms: [],
  tags: [],
  minHealth: null,
  maxHealth: null,
  sort: 'name',
  group: 'none',
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
 * Free-text search across name, title, kingdom, and ability name + rules text.
 * Alternate versions are folded in — their names and abilities match the one
 * character that carries them, rather than appearing as separate results.
 */
function matchesText(character: Character, needle: string): boolean {
  if (!needle) return true
  const haystack = normalize(
    [
      character.name,
      character.title ?? '',
      kingdomName(character.kingdom),
      ...(character.variants ?? []).flatMap((v) => [v.label, v.name ?? '', v.title ?? '']),
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
  const { q, kingdoms, tags, minHealth, maxHealth } = query
  return source.filter((c) => {
    if (kingdoms.length && !kingdoms.includes(c.kingdom)) return false
    if (minHealth !== null && c.health < minHealth) return false
    if (maxHealth !== null && c.health > maxHealth) return false
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
    case 'health-desc':
      return copy.sort((a, b) => b.health - a.health || byName(a, b))
    case 'health-asc':
      return copy.sort((a, b) => a.health - b.health || byName(a, b))
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
    (query.minHealth !== null ? 1 : 0) +
    (query.maxHealth !== null ? 1 : 0)
  )
}

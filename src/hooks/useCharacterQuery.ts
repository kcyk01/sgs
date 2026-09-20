import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { CharacterQuery, GroupKey, SortKey } from '../lib/query'
import { emptyQuery } from '../lib/query'

// An unrecognised value falls back to the default, so links shared before a
// sort was renamed still open — just not on the sort they were shared with.
const SORTS: SortKey[] = ['name', 'color']
const GROUPS: GroupKey[] = ['none', 'kingdom', 'health']

function parseList(value: string | null): string[] {
  return value ? value.split(',').filter(Boolean) : []
}

function parseNumberList(value: string | null): number[] {
  return [
    ...new Set(
      parseList(value)
        .map(Number)
        .filter((n) => Number.isFinite(n)),
    ),
  ].sort((a, b) => a - b)
}

/**
 * Search/filter state lives in the URL, not component state. On mobile this
 * matters: the browser back gesture undoes a filter instead of leaving the app,
 * and a filtered list can be shared or reloaded without losing context.
 */
export function useCharacterQuery(): {
  query: CharacterQuery
  setQuery: (patch: Partial<CharacterQuery>) => void
  resetFilters: () => void
} {
  const [params, setParams] = useSearchParams()

  const query = useMemo<CharacterQuery>(() => {
    const sort = params.get('sort') as SortKey | null
    const group = params.get('group') as GroupKey | null
    return {
      q: params.get('q') ?? '',
      kingdoms: parseList(params.get('kingdom')),
      tags: parseList(params.get('tag')),
      healths: parseNumberList(params.get('hp')),
      abilityCounts: parseNumberList(params.get('abilities')),
      sort: sort && SORTS.includes(sort) ? sort : emptyQuery.sort,
      group: group && GROUPS.includes(group) ? group : emptyQuery.group,
    }
  }, [params])

  const setQuery = useCallback(
    (patch: Partial<CharacterQuery>) => {
      const next = { ...query, ...patch }
      const sp = new URLSearchParams()
      if (next.q) sp.set('q', next.q)
      if (next.kingdoms.length) sp.set('kingdom', next.kingdoms.join(','))
      if (next.tags.length) sp.set('tag', next.tags.join(','))
      if (next.healths.length) sp.set('hp', next.healths.join(','))
      if (next.abilityCounts.length)
        sp.set('abilities', next.abilityCounts.join(','))
      if (next.sort !== emptyQuery.sort) sp.set('sort', next.sort)
      if (next.group !== emptyQuery.group) sp.set('group', next.group)
      // replace: typing in the search box should not fill up the history stack.
      setParams(sp, { replace: true })
    },
    [query, setParams],
  )

  const resetFilters = useCallback(() => {
    setParams(new URLSearchParams(), { replace: true })
  }, [setParams])

  return { query, setQuery, resetFilters }
}

/** Toggle a value in one of the array-valued filters. */
export function toggleInList<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

/**
 * Radio-style selection for the single-choice filters: picking a value replaces
 * whatever was selected, and picking the selected one again clears the filter.
 * Still an array so the URL format and the OR-semantics filtering stay as-is.
 */
export function selectOnly<T>(list: T[], value: T): T[] {
  return list.includes(value) ? [] : [value]
}

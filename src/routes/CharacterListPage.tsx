import { useMemo, useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { CardTypeTabs } from '../components/CardTypeTabs'
import { CharacterTile } from '../components/CharacterTile'
import { FilterSheet } from '../components/FilterSheet'
import { SearchBar } from '../components/SearchBar'
import { characters } from '../data/characters'
import { useCharacterQuery } from '../hooks/useCharacterQuery'
import {
  activeFilterCount,
  filterCharacters,
  groupCharacters,
  sortCharacters,
} from '../lib/query'
import { characterVersions } from '../lib/versions'

export default function CharacterListPage() {
  const { query, setQuery, resetFilters } = useCharacterQuery()
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Search, filter, sort and group all run on *characters*; each is only then
  // expanded into its printings. That order is what keeps an alternate art
  // sitting immediately after the card it belongs to, however the list is
  // sorted — which is the only place a player scanning for a picture would
  // think to look for it.
  const groups = useMemo(() => {
    const filtered = filterCharacters(characters, query)
    return groupCharacters(
      sortCharacters(filtered, query.sort),
      query.group,
    ).map((group) => ({ ...group, items: group.items.flatMap(characterVersions) }))
  }, [query])

  // Counts printings, not characters, so the group headers and the filter
  // sheet's "Show N cards" both describe what is actually on screen.
  const total = useMemo(
    () => groups.reduce((n, g) => n + g.items.length, 0),
    [groups],
  )

  return (
    <>
      <AppHeader title="Characters" />
      <main className="app__main">
        <CardTypeTabs />
        <SearchBar
          value={query.q}
          onChange={(q) => setQuery({ q })}
          onOpenFilters={() => setFiltersOpen(true)}
          activeFilters={activeFilterCount(query)}
        />

        {total === 0 ? (
          <p className="empty">
            No characters match.
            <br />
            <button type="button" className="btn btn--link" onClick={resetFilters}>
              Clear search and filters
            </button>
          </p>
        ) : (
          groups.map((group) => (
            <section className="list-group" key={group.key}>
              {/* Ungrouped renders a single "All characters" group, so this
                  doubles as the result counter. */}
              <h2 className="list-group__header">
                <span>{group.label}</span>
                <span>{group.items.length}</span>
              </h2>
              <div className="grid">
                {group.items.map((v) => (
                  <CharacterTile key={v.id} version={v} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        query={query}
        setQuery={setQuery}
        onReset={resetFilters}
        resultCount={total}
      />
    </>
  )
}

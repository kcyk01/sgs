import { useMemo, useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { CharacterRow } from '../components/CharacterRow'
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

export default function CharacterListPage() {
  const { query, setQuery, resetFilters } = useCharacterQuery()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const groups = useMemo(() => {
    const filtered = filterCharacters(characters, query)
    return groupCharacters(sortCharacters(filtered, query.sort), query.group)
  }, [query])

  const total = useMemo(
    () => groups.reduce((n, g) => n + g.items.length, 0),
    [groups],
  )

  return (
    <>
      <AppHeader title="Characters" />
      <main className="app__main">
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
              <div className="list">
                {group.items.map((c) => (
                  <CharacterRow key={c.id} character={c} />
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

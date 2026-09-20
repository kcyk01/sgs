import { useEffect, useRef } from 'react'
import { Icon } from './Icon'
import {
  abilityCountValues,
  allAbilityTags,
  cardPackValues,
  genderValues,
  healthValues,
} from '../data/characters'
import { genderInfo, genderName } from '../data/genders'
import { kingdoms } from '../data/kingdoms'
import { selectOnly, toggleInList } from '../hooks/useCharacterQuery'
import type { CharacterQuery, GroupKey, SortKey } from '../lib/query'
import { activeFilterCount } from '../lib/query'

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'pack', label: 'Pack' },
  { key: 'name', label: 'Name' },
  { key: 'color', label: 'Colour' },
]

const groupOptions: { key: GroupKey; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'kingdom', label: 'Kingdom' },
  { key: 'health', label: 'Health' },
]

/**
 * Bottom sheet, not a full page or a side drawer: it keeps the result count in
 * view and is dismissible with a downward thumb reach.
 *
 * Uses a native <dialog> so Esc, focus trapping, and the backdrop come for free.
 */
export function FilterSheet({
  open,
  onClose,
  query,
  setQuery,
  onReset,
  resultCount,
}: {
  open: boolean
  onClose: () => void
  query: CharacterQuery
  setQuery: (patch: Partial<CharacterQuery>) => void
  onReset: () => void
  resultCount: number
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label="Filter and sort"
      // Fires on Esc and on programmatic close; keeps React state in sync.
      onClose={onClose}
      // Tap on the backdrop (outside the panel) dismisses.
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      <div className="sheet__panel">
        <div className="sheet__grabber" />
        <div className="sheet__head">
          <span className="sheet__title">Filter &amp; sort</span>
          <button type="button" className="btn btn--link" onClick={onReset}>
            Reset all
          </button>
          <button
            type="button"
            className="sheet__close"
            onClick={onClose}
            aria-label="Close filters"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="sheet__section">
          <span className="sheet__label">Kingdom</span>
          <div className="chip-row">
            {kingdoms.map((k) => {
              const selected = query.kingdoms.includes(k.id)
              return (
                <button
                  key={k.id}
                  type="button"
                  aria-pressed={selected}
                  className={`chip chip--button${selected ? ' chip--selected' : ''}`}
                  onClick={() =>
                    setQuery({ kingdoms: selectOnly(query.kingdoms, k.id) })
                  }
                >
                  <span className="chip__dot" style={{ background: k.color }} />
                  {k.name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="sheet__section">
          <span className="sheet__label">Health</span>
          <div className="chip-row">
            {healthValues.map((hp) => {
              const selected = query.healths.includes(hp)
              return (
                <button
                  key={hp}
                  type="button"
                  aria-pressed={selected}
                  className={`chip chip--button${selected ? ' chip--selected' : ''}`}
                  onClick={() =>
                    setQuery({ healths: selectOnly(query.healths, hp) })
                  }
                >
                  {hp}
                </button>
              )
            })}
          </div>
        </div>

        <div className="sheet__section">
          {/* "Ability count", not "Abilities" — the tag filter below is also
              about abilities, and two sections a thumb-width apart both
              labelled "Abilities" would be a coin toss. */}
          <span className="sheet__label">Ability count</span>
          <div className="chip-row">
            {abilityCountValues.map((n) => {
              const selected = query.abilityCounts.includes(n)
              return (
                <button
                  key={n}
                  type="button"
                  // Two rows of bare numeric chips now sit a thumb-width apart;
                  // "2, pressed" on its own doesn't say which row it came from.
                  aria-label={`${n} ${n === 1 ? 'ability' : 'abilities'}`}
                  aria-pressed={selected}
                  className={`chip chip--button${selected ? ' chip--selected' : ''}`}
                  onClick={() =>
                    setQuery({ abilityCounts: selectOnly(query.abilityCounts, n) })
                  }
                >
                  {n}
                </button>
              )
            })}
          </div>
        </div>

        {genderValues.length > 0 && (
          <div className="sheet__section">
            <span className="sheet__label">Gender</span>
            <div className="chip-row">
              {genderValues.map((gender) => {
                const selected = query.genders.includes(gender)
                const info = genderInfo(gender)
                return (
                  <button
                    key={gender}
                    type="button"
                    aria-pressed={selected}
                    className={`chip chip--button${selected ? ' chip--selected' : ''}`}
                    onClick={() =>
                      setQuery({ genders: selectOnly(query.genders, gender) })
                    }
                  >
                    {/* Colour on the glyph only, not the whole chip: the label
                        has to stay legible, and it needs to turn accent-
                        coloured with the rest of the chip when selected.
                        Plays the same role the kingdom chips' dot does. */}
                    {info && (
                      <span className="chip__glyph" style={{ color: info.color }}>
                        <Icon name={info.icon} size={14} />
                      </span>
                    )}
                    {genderName(gender)}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {cardPackValues.length > 0 && (
          <div className="sheet__section">
            <span className="sheet__label">Card pack</span>
            <div className="chip-row">
              {cardPackValues.map((pack) => {
                const selected = query.cardPacks.includes(pack)
                return (
                  <button
                    key={pack}
                    type="button"
                    aria-pressed={selected}
                    className={`chip chip--button${selected ? ' chip--selected' : ''}`}
                    onClick={() =>
                      setQuery({ cardPacks: selectOnly(query.cardPacks, pack) })
                    }
                  >
                    {pack}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {allAbilityTags.length > 0 && (
          <div className="sheet__section">
            <span className="sheet__label">Ability</span>
            <div className="chip-row">
              {allAbilityTags.map((tag) => {
                const selected = query.tags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={selected}
                    className={`chip chip--button${selected ? ' chip--selected' : ''}`}
                    onClick={() => setQuery({ tags: toggleInList(query.tags, tag) })}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="sheet__section">
          <span className="sheet__label">Sort</span>
          <div className="segmented">
            {sortOptions.map((o) => (
              <button
                key={o.key}
                type="button"
                className="segmented__option"
                aria-pressed={query.sort === o.key}
                onClick={() => setQuery({ sort: o.key })}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="sheet__section">
          <span className="sheet__label">Group by</span>
          <div className="segmented">
            {groupOptions.map((o) => (
              <button
                key={o.key}
                type="button"
                className="segmented__option"
                aria-pressed={query.group === o.key}
                onClick={() => setQuery({ group: o.key })}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="sheet__actions">
          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={onClose}
          >
            Show {resultCount} {resultCount === 1 ? 'card' : 'cards'}
            {activeFilterCount(query) > 0 ? ` · ${activeFilterCount(query)} filters` : ''}
          </button>
        </div>
      </div>
    </dialog>
  )
}

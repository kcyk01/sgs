import { Icon } from './Icon'

export function SearchBar({
  value,
  onChange,
  onOpenFilters,
  activeFilters,
}: {
  value: string
  onChange: (next: string) => void
  onOpenFilters: () => void
  activeFilters: number
}) {
  return (
    <div className="searchbar">
      <div className="searchbar__field">
        <Icon name="search" size={18} />
        <input
          className="searchbar__input"
          type="search"
          // "search" enter key + no autocorrect/capitalise: mobile keyboard hygiene.
          enterKeyHint="search"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Search name, kingdom, ability…"
          aria-label="Search characters"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button
            type="button"
            className="searchbar__clear"
            onClick={() => onChange('')}
            aria-label="Clear search"
          >
            <Icon name="close" size={16} />
          </button>
        )}
      </div>
      <button
        type="button"
        className={
          activeFilters > 0
            ? 'searchbar__filter searchbar__filter--active'
            : 'searchbar__filter'
        }
        onClick={onOpenFilters}
        aria-label={`Filters${activeFilters > 0 ? `, ${activeFilters} active` : ''}`}
      >
        <Icon name="filter" size={18} />
        {activeFilters > 0 && (
          <span className="searchbar__badge">{activeFilters}</span>
        )}
      </button>
    </div>
  )
}

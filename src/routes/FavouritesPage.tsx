import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { CharacterRow } from '../components/CharacterRow'
import { characterById } from '../data/characters'
import { useFavourites } from '../hooks/useFavourites'
import { useRecentlyViewed } from '../hooks/useRecentlyViewed'
import { clearFavourites } from '../lib/favourites'
import { sortCharacters } from '../lib/query'
import { clearRecentlyViewed } from '../lib/recent'

/**
 * The cards in play this game, plus the cards just looked at. Deliberately
 * plain — no search or filters: the list is short by construction, and the
 * point is reading it at a glance mid-game.
 */
export default function FavouritesPage() {
  const favourites = useFavourites()
  const recentIds = useRecentlyViewed()

  const items = useMemo(
    () =>
      sortCharacters(
        // Ids can outlive the cards they point at if the roster is edited.
        [...favourites].flatMap((id) => characterById.get(id) ?? []),
        'name',
      ),
    [favourites],
  )

  // Kept in visit order rather than sorted by name: "what did I just look at"
  // is the question this section answers, and the newest card should be first.
  // Favourites are dropped — they are already listed above, and showing a card
  // twice on one short page reads as a bug.
  const recent = useMemo(
    () =>
      recentIds.flatMap((id) =>
        // Ids can outlive the cards they point at if the roster is edited.
        favourites.has(id) ? [] : (characterById.get(id) ?? []),
      ),
    [recentIds, favourites],
  )

  return (
    <>
      <AppHeader
        title="Favourites"
        actions={
          items.length > 0 && (
            <button
              type="button"
              className="btn btn--link"
              onClick={() => {
                if (window.confirm('Remove all characters from favourites?'))
                  clearFavourites()
              }}
            >
              Clear favourites
            </button>
          )
        }
      />
      <main className="app__main">
        {items.length === 0 && recent.length === 0 ? (
          <p className="empty">
            No favourites yet.
            <br />
            Open a character and tap the heart to keep it here for the game.
            <br />
            <Link className="btn btn--link" to="/">
              Browse characters
            </Link>
          </p>
        ) : (
          <>
            {items.length > 0 && (
              <section className="list-group">
                <h2 className="list-group__header">
                  <span>In play</span>
                  <span>{items.length}</span>
                </h2>
                <div className="list">
                  {items.map((c) => (
                    <CharacterRow key={c.id} character={c} />
                  ))}
                </div>
              </section>
            )}
            {/* Always below the favourites: this is a convenience for getting
                back to a card, not the list the page is about. */}
            {recent.length > 0 && (
              <section className="list-group">
                <h2 className="list-group__header">
                  <span>Recently viewed</span>
                  <span>{recent.length}</span>
                </h2>
                <div className="list">
                  {recent.map((c) => (
                    <CharacterRow key={c.id} character={c} />
                  ))}
                </div>
                {/* No confirmation: nothing is lost that re-opening a card
                    would not restore. */}
                <div className="list-group__footer">
                  <button
                    type="button"
                    className="btn btn--link"
                    onClick={clearRecentlyViewed}
                  >
                    Clear recently viewed
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </>
  )
}

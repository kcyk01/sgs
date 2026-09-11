import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { CharacterRow } from '../components/CharacterRow'
import { characterById } from '../data/characters'
import { useFavourites } from '../hooks/useFavourites'
import { clearFavourites } from '../lib/favourites'
import { sortCharacters } from '../lib/query'

/**
 * The cards in play this game. Deliberately plain — no search or filters: the
 * list is short by construction, and the point is reading it at a glance
 * mid-game.
 */
export default function FavouritesPage() {
  const favourites = useFavourites()

  const items = useMemo(
    () =>
      sortCharacters(
        // Ids can outlive the cards they point at if the roster is edited.
        [...favourites].flatMap((id) => characterById.get(id) ?? []),
        'name',
      ),
    [favourites],
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
              Clear all
            </button>
          )
        }
      />
      <main className="app__main">
        {items.length === 0 ? (
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
      </main>
    </>
  )
}

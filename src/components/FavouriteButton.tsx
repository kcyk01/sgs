import { useIsFavourite } from '../hooks/useFavourites'
import { toggleFavourite } from '../lib/favourites'
import { Icon } from './Icon'

/**
 * Heart toggle for one character. Takes the *base* character id — favourites
 * are per character, not per printing.
 */
export function FavouriteButton({ id }: { id: string }) {
  const isFavourite = useIsFavourite(id)

  return (
    <button
      type="button"
      className={`icon-btn${isFavourite ? ' icon-btn--on' : ''}`}
      aria-pressed={isFavourite}
      aria-label={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
      onClick={() => toggleFavourite(id)}
    >
      <Icon name={isFavourite ? 'heart' : 'heart-outline'} size={22} />
    </button>
  )
}

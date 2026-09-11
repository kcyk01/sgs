import { useState } from 'react'
import type { NamedCardArtSource } from '../lib/images'
import { cardImageUrl } from '../lib/images'

/**
 * Card art with a graceful fallback: until real images are dropped into
 * `public/cards/`, every card renders an initials placeholder instead of a
 * broken-image icon.
 *
 * Takes any card that has an id and a name — a character, one of its variants,
 * or a weapon — rather than a `Character`, since none of this depends on
 * kingdoms or abilities.
 */
export function CardThumb({
  card,
  className,
  onLoadError,
}: {
  card: NamedCardArtSource
  className: string
  /**
   * Called when the art is missing, so a parent can hide affordances that only
   * make sense with real art (e.g. the detail page's tap-to-enlarge).
   * Pass `key={card.id}` when reusing this component across cards, so the
   * internal failure state does not leak from one card to the next.
   */
  onLoadError?: () => void
}) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    // A <span>, not a <div>: this renders inside a <button> on the detail page,
    // whose content model only allows phrasing content.
    return (
      <span
        className={className}
        aria-hidden="true"
        style={{
          display: 'grid',
          placeItems: 'center',
          fontWeight: 700,
          color: 'var(--c-muted)',
        }}
      >
        {card.name.slice(0, 1)}
      </span>
    )
  }

  return (
    <img
      className={className}
      src={cardImageUrl(card)}
      alt=""
      // Native lazy loading is enough here; rows are cheap and mostly offscreen.
      loading="lazy"
      decoding="async"
      onError={() => {
        setFailed(true)
        onLoadError?.()
      }}
    />
  )
}

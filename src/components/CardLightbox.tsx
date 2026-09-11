import { useEffect, useRef } from 'react'
import type { Character } from '../types/character'
import { cardImageUrl } from '../lib/images'
import { Icon } from './Icon'

/**
 * Full-screen card art, for holding a physical card up against the screen.
 *
 * Native <dialog> again for Esc + focus trapping. Note the CSS keeps `.lightbox`
 * at `display: none` and only `.lightbox[open]` is flex — an author `display`
 * rule overrides the UA's `dialog:not([open]) { display: none }` and would leave
 * an invisible full-screen tap-blocker behind.
 */
export function CardLightbox({
  character,
  open,
  onClose,
  caption,
}: {
  character: Character
  open: boolean
  onClose: () => void
  /** Overrides the default name caption, e.g. to name the alternate version. */
  caption?: string
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
      className="lightbox"
      aria-label={`${character.name} card art`}
      onClose={onClose}
      // Tap anywhere outside the image closes — the whole backdrop is the target.
      onClick={onClose}
    >
      <button
        type="button"
        className="lightbox__close"
        onClick={onClose}
        aria-label="Close image"
      >
        <Icon name="close" size={18} />
      </button>
      <img
        className="lightbox__img"
        src={cardImageUrl(character)}
        alt={`${character.name} card`}
        // Stop the tap-to-close from firing when the image itself is tapped, so
        // pinch-zooming the art does not dismiss the viewer.
        onClick={(e) => e.stopPropagation()}
      />
      <p className="lightbox__caption">{caption ?? character.name}</p>
    </dialog>
  )
}

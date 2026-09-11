import { cardType } from '../data/cards'

/**
 * An inline reference to another card inside rules text — "discard an Attack".
 *
 * Deliberately not a `.chip`: chips are standalone, tappable, block-ish things
 * sitting in a row of their own. This has to sit *inside* a sentence, so it
 * stays `display: inline`, sizes in `em` off the surrounding text, and adds no
 * vertical padding that would open up the line spacing of a paragraph.
 *
 * Basic / tool / equipment share one token shape and differ only in colour:
 * they are all cards, and giving them different geometry would make a sentence
 * containing two kinds read as two unrelated things. The kind comes from the
 * registry in `data/cards.ts`, never from the markup.
 */
export function CardRef({ name }: { name: string }) {
  const kind = cardType(name)
  return (
    <span className={kind === 'basic' ? 'cardref' : `cardref cardref--${kind}`}>
      {name}
    </span>
  )
}

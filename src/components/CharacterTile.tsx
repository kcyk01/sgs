import { Link } from 'react-router-dom'
import { kingdomColor } from '../data/kingdoms'
import type { Character } from '../types/character'
import { CardThumb } from './CardThumb'
import { HealthBadge } from './HealthBadge'

/**
 * One tile in the character grid. The whole tile is the tap target.
 *
 * Art-first, because of what this screen is actually for mid-game: a player
 * holds a card they can't read, and the question is "which of these is it?" —
 * answered by looking, not by reading. So the art gets the full column width,
 * the epithet is dropped entirely, and the three things worth keeping are laid
 * out so none of them steal height from the image:
 *
 * - kingdom becomes the tile's border colour (scannable in peripheral vision,
 *   and it matches the colour printed on the physical card),
 * - health pips sit over the bottom of the art on a scrim,
 * - the name is a single small caption line, for anyone who *can* read it.
 *
 * `CharacterRow` is the denser text-first variant, still used by Favourites.
 */
export function CharacterTile({ character }: { character: Character }) {
  return (
    <Link
      to={`/c/${character.id}`}
      className="card-tile"
      // Tinted rather than the raw kingdom colour: four saturated outlines per
      // screen would fight the art they surround.
      style={{
        borderColor: `color-mix(in srgb, ${kingdomColor(character.kingdom)} 45%, var(--c-border))`,
      }}
    >
      {/* Spans throughout: CardThumb's missing-art fallback is a <span>, and
          this is all inside an <a>. */}
      <span className="card-tile__art">
        <CardThumb card={character} className="card-tile__img" />
        <span className="card-tile__health">
          <HealthBadge health={character.health} />
        </span>
      </span>
      <span className="card-tile__name">{character.name}</span>
    </Link>
  )
}

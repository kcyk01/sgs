import { Link } from 'react-router-dom'
import { assetUrl } from '../lib/images'
import type { CharacterVersion } from '../lib/versions'
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
 * - kingdom is shown by overlaying the printed card frame for that kingdom
 *   (the gold king frame for lords), so the tile reads like the physical card,
 * - health pips sit over the top of the frame on a scrim,
 * - the name is a single small caption line, for anyone who *can* read it.
 *
 * Takes a *version*, not a character: alternate printings are separate tiles,
 * since the whole point of the grid is that every picture a player might be
 * holding is on screen to match against. Both lead to the same detail route —
 * the variant deep-links to its own printing via `?v=`.
 *
 * `CharacterRow` is the denser text-first variant, still used by Favourites.
 */
export function CharacterTile({ version }: { version: CharacterVersion }) {
  const isVariant = version.index > 0

  return (
    <Link
      to={
        isVariant
          ? `/c/${version.baseId}?v=${encodeURIComponent(version.id)}`
          : `/c/${version.baseId}`
      }
      className="card-tile"
    >
      {/* Spans throughout: CardThumb's missing-art fallback is a <span>, and
          this is all inside an <a>. */}
      <span className="card-tile__art">
        <CardThumb card={version} className="card-tile__img" />
        {/* Assumes the art already lines up with the frame's window — no
            per-card offset yet. */}
        <img
          className="card-tile__frame"
          src={frameUrl(version)}
          alt=""
          loading="lazy"
          decoding="async"
        />
        {/* Alt printings usually share a name with the base card, so without
            this two identical captions sit side by side. */}
        {isVariant && (
          <span className="card-tile__label">{version.label}</span>
        )}
        <span className="card-tile__health">
          <HealthBadge health={version.health} />
        </span>
      </span>
      <span className="card-tile__name">{version.name}</span>
    </Link>
  )
}

/**
 * The printed frame for a version: its `frame` override if set, otherwise
 * `frame-<kingdom>.webp`, or the king frame when any of its abilities is tagged
 * `king`. Per version, since a variant can change kingdom or drop the lord
 * ability.
 */
function frameUrl(version: CharacterVersion): string {
  if (version.frame) return assetUrl(`cards/${version.frame}.webp`)
  const isKing = version.abilities.some((a) => a.tags?.includes('king'))
  return assetUrl(
    `cards/${isKing ? 'king-frame' : 'frame'}-${version.kingdom}.webp`,
  )
}

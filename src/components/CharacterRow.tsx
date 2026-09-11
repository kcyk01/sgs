import { Link } from 'react-router-dom'
import type { Character } from '../types/character'
import { CardThumb } from './CardThumb'
import { HealthBadge } from './HealthBadge'
import { KingdomChip } from './KingdomChip'

/** One row in the character list. The whole row is the tap target. */
export function CharacterRow({ character }: { character: Character }) {
  return (
    <Link to={`/c/${character.id}`} className="card-row">
      <CardThumb character={character} className="card-row__thumb" />
      <div className="card-row__body">
        <div className="card-row__name">{character.name}</div>
        {character.title && (
          <div className="card-row__title">{character.title}</div>
        )}
        <div className="card-row__meta">
          <HealthBadge health={character.health} />
          <KingdomChip id={character.kingdom} />
        </div>
      </div>
    </Link>
  )
}

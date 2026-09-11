import { kingdomByName } from '../data/kingdoms'

/**
 * A kingdom named inside rules text — "another Shu character".
 *
 * Colour only, no chip: these appear mid-sentence and often more than once in a
 * paragraph, so a bordered token would fight with the `CardRef`s around it. The
 * colour is the one already defined in `data/kingdoms.ts`, so it matches the
 * `KingdomChip` on the same page rather than being a second source of truth.
 */
export function KingdomRef({ name }: { name: string }) {
  const kingdom = kingdomByName.get(name)
  return (
    <span className="kingdomref" style={kingdom && { color: kingdom.color }}>
      {name}
    </span>
  )
}

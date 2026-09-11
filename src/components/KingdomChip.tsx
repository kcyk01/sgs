import { kingdomColor, kingdomName } from '../data/kingdoms'

export function KingdomChip({ id }: { id: string }) {
  return (
    <span className="chip">
      <span className="chip__dot" style={{ background: kingdomColor(id) }} />
      {kingdomName(id)}
    </span>
  )
}

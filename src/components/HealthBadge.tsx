import { assetUrl } from '../lib/images'

/**
 * Health, drawn the way the physical card draws it: one pip per point, rather
 * than an icon with a number beside it.
 *
 * Above `MAX_PIPS` it falls back to a single pip and a count — a row of ten
 * would wrap out of a list row, and by then the shape has stopped being
 * countable at a glance anyway, which was the whole point of pips.
 */
const MAX_PIPS = 6

function Pip() {
  return (
    <img
      className="health__pip"
      src={assetUrl('icons/health.png')}
      alt=""
      aria-hidden="true"
      // Repeated <img> rather than a repeating background: it's one cached
      // request either way, and this keeps the spacing a plain flex `gap`.
      draggable={false}
    />
  )
}

export function HealthBadge({ health }: { health: number }) {
  const pips = Math.max(0, Math.floor(health))

  return (
    <span className="health" title={`${health} health`}>
      {pips === 0 ? (
        <span className="health__count">0</span>
      ) : pips <= MAX_PIPS ? (
        Array.from({ length: pips }, (_, i) => <Pip key={i} />)
      ) : (
        <>
          <Pip />
          <span className="health__count">×{pips}</span>
        </>
      )}
      {/* The pips are decorative; this is the only thing a screen reader says. */}
      <span className="sr-only">{health} health</span>
    </span>
  )
}

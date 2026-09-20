import { Icon } from './Icon'
import { genderInfo, genderName } from '../data/genders'
import type { Gender } from '../types/character'

/**
 * Mini gender indicator, sat beside the kingdom chip on the detail page.
 *
 * Glyph-only on purpose: it is a secondary detail next to health and kingdom,
 * and the Mars/Venus symbols are the card's own shorthand. The word is still
 * there for screen readers and on long-press / hover.
 */
export function GenderChip({ gender }: { gender: Gender }) {
  const label = genderName(gender)
  const info = genderInfo(gender)
  return (
    <span
      className="chip chip--icon"
      title={label}
      // Colour on the chip rather than the svg: `Icon` paints with
      // currentColor, so the glyph inherits it and a text fallback matches.
      style={info ? { color: info.color } : undefined}
    >
      {info ? (
        <>
          <Icon name={info.icon} size={14} />
          <span className="sr-only">{label}</span>
        </>
      ) : (
        label
      )}
    </span>
  )
}

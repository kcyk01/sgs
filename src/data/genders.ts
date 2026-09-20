import type { IconName } from '../components/Icon'
import type { Gender } from '../types/character'

/**
 * Display labels for `Character.gender`. The ids are what appear in filter
 * URLs, so changing one invalidates shared links; the labels are free to
 * change. Order here is the order of the filter chips.
 */
export const genders: {
  id: Gender
  name: string
  icon: IconName
  /** Glyph colour. Deliberately not a kingdom colour — the two chips sit side
      by side, and matching Wei's blue would read as a second kingdom dot. */
  color: string
}[] = [
  { id: 'M', name: 'Male', icon: 'male', color: '#5aa9f7' },
  { id: 'F', name: 'Female', icon: 'female', color: '#f2597b' },
]

export function genderName(id: string): string {
  return genders.find((g) => g.id === id)?.name ?? id
}

/** The full entry for a gender, or undefined for an id not declared above. */
export function genderInfo(id: Gender) {
  return genders.find((g) => g.id === id)
}

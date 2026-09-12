import type { Ability, Character } from '../types/character'

/**
 * A single swipeable version of a character, flattened so consumers never have
 * to know whether they are looking at the base card or a variant patch.
 *
 * It *is* a `Character`, so anything that already renders a character — the
 * thumbnail, the lightbox, `cardImageUrl` — takes a version unchanged.
 */
export interface CharacterVersion extends Character {
  /** Switcher label. The base version is labelled "Original". */
  label: string
  /** 0 for the base card, 1+ for variants in declaration order. */
  index: number
  /** The id of the character this version belongs to — i.e. the route id. */
  baseId: string
}

/** Label used for the base printing when a character has variants. */
export const BASE_VERSION_LABEL = 'Original'

/**
 * Every ability across every version of a character.
 *
 * The list page searches and filters on this rather than on `character.abilities`
 * alone: a variant's abilities are printed on a real card, so looking one up by
 * name or tag has to lead back to the character that carries it.
 */
export function allAbilities(character: Character): Ability[] {
  if (!character.variants?.length) return character.abilities
  return [
    ...character.abilities,
    ...character.variants.flatMap((v) => v.abilities ?? []),
  ]
}

/**
 * How many abilities each printing of a character has, deduplicated.
 *
 * Per *version*, not summed across them: a character with a 2-ability base and
 * a 3-ability variant returns [2, 3], because that's two cards you could hold,
 * one with two abilities and one with three. Summing to 5 would describe a card
 * that doesn't exist. A variant that doesn't restate `abilities` inherits the
 * base's, so it contributes the same count rather than zero.
 */
export function abilityCounts(character: Character): number[] {
  return [
    ...new Set(characterVersions(character).map((v) => v.abilities.length)),
  ].sort((a, b) => a - b)
}

/**
 * Flattens a character into its ordered list of versions: the base card first,
 * then each variant merged over it. Always returns at least one entry, so the
 * detail page can render versions[n] without a special case for the ~99% of
 * characters that have no variants.
 */
export function characterVersions(character: Character): CharacterVersion[] {
  const base: CharacterVersion = {
    ...character,
    label: BASE_VERSION_LABEL,
    index: 0,
    baseId: character.id,
  }

  if (!character.variants?.length) return [base]

  return [
    base,
    ...character.variants.map((variant, i) => {
      // Spread the patch last, but strip its undefined keys first: an explicit
      // `title: undefined` in the data would otherwise blank out the base title.
      const patch = Object.fromEntries(
        Object.entries(variant).filter(([, v]) => v !== undefined),
      )
      return {
        ...character,
        ...patch,
        label: variant.label,
        index: i + 1,
        baseId: character.id,
      } as CharacterVersion
    }),
  ]
}

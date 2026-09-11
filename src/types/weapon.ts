/**
 * A weapon card. Deliberately *not* a `Character` with optional fields: the two
 * share only a name. A weapon has no kingdom, no health and no ability list, so
 * every character-shaped filter, group and badge would have to grow a "not
 * applicable" branch to accommodate one.
 */
export interface Weapon {
  /** Stable slug, unique among weapons. Used as the React key and anchor id. */
  id: string
  /** Name exactly as printed — also how rules text references it: `[Axe]`. */
  name: string
  /** Attack range, in seats. 1 means adjacent players only. */
  range: number
  /**
   * Rules text. Same inline markup as `Ability.description` — `[Card]`
   * references, automatic kingdom colouring, `\n` line breaks. See `RulesText`.
   */
  description: string
  /**
   * Override the conventional art path. Leave undefined to use
   * /cards/<id>.webp, exactly as characters do — weapon ids share the character
   * id namespace for this reason.
   */
  image?: string
}

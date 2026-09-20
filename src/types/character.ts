/**
 * Core domain types. Everything the UI renders derives from these, so this file is
 * the single place to change when the card data model grows.
 */

/** A kingdom / faction a character belongs to. */
export interface Kingdom {
  /** Stable slug used in URLs and filter query params, e.g. "ember-reach". */
  id: string
  name: string
  /** CSS color used for chips and accents. */
  color: string
  /** Optional blurb. Not rendered anywhere yet. */
  description?: string
}

/**
 * A character's gender. A closed union rather than a free string so a typo in
 * the data is a compile error instead of a filter chip nobody can match — see
 * `genders` in src/data/genders.ts for the display labels.
 */
export type Gender = 'M' | 'F'

export interface Ability {
  name: string
  /**
   * Rules text. Plain string with two bits of inline markup, both handled by
   * `RulesText`:
   *
   * - A card name in square brackets renders as a highlighted token:
   *   `'Discard an [Attack] to remove a [Chains].'` Basic, tool and equipment
   *   cards are coloured differently, but all use the same brackets — the type
   *   is looked up in `data/cards.ts`, where each card is declared once.
   *   Referencing a card that isn't registered warns in the dev console.
   * - A kingdom name is detected automatically and tinted its kingdom colour:
   *   `'Another Shu character may play an [Attack].'`
   *
   * - A newline forces a line break, so conditions can be listed. Lines opening
   *   with `1.` / `2)` / `-` / `•` get a hanging indent:
   *   `'The target cannot [Dodge] if:\n1. they are far away\n2. they hold 2+ cards'`
   *   A literal `<br>` is accepted as a synonym for `\n`, but the text is never
   *   parsed as HTML — no other tag does anything.
   *
   * A backslash escapes the next character — `'\\[not a card]'`, or `'\\Wu
   * Guotai'` when "Wu" is a person's name rather than the kingdom.
   *
   * Swap for MDX/markdown later if this grows past a handful of rules.
   */
  description: string
  /**
   * Short machine-friendly labels ("heal", "ranged", "on-death") used by the
   * ability filter. Keep them lowercase and kebab-case.
   */
  tags?: string[]
}

export interface Character {
  /** Stable slug. Also the default image filename: /cards/<id>.webp */
  id: string
  name: string
  /** Optional epithet, e.g. "the Unbroken". */
  title?: string
  /** Kingdom.id */
  kingdom: string
  health: number
  /** Omit when unknown or not applicable; the filter then never matches it. */
  gender?: Gender
  abilities: Ability[]
  /**
   * Override the conventional image path. Leave undefined to use /cards/<id>.webp
   * (see `cardImageUrl` in src/lib/images.ts).
   */
  image?: string
  /** Long-form lore / designer notes. Optional. */
  flavor?: string
  /**
   * The booster/expansion pack this printing comes from, e.g. "Wind". Omit for
   * cards in the base set — the pack filter only offers packs that appear in
   * the data, so an unset value simply never matches one.
   */
  cardPack?: string
  /**
   * Extra words the search box should match on, space separated. Never
   * rendered — this is purely a hook for things a player can see on the card
   * but that no other field names: art details ("hat spear horse tiger"),
   * nicknames, romanization variants, the Chinese name.
   *
   * Matching is the same as everywhere else: lowercased and diacritic-stripped,
   * substring per term, so "hat" also matches "hatchet". Keep entries short and
   * prefer several specific words over a sentence.
   */
  searchTerms?: string
  /**
   * The class label this card maps to in a trained model's output.
   *
   * Unused by the current scanner, which is retrieval over precomputed artwork
   * descriptors keyed on `id` and needs no separate label space. Kept for a
   * recognizer that does — see src/features/scan/README.md.
   */
  modelLabel?: string
  /**
   * Alternate printings of the same character — a reworked/forsaken/seasonal
   * version with its own art and (usually) its own abilities. The character's
   * own fields above are always version 0; these follow in the order listed and
   * are reachable by swiping the art on the detail page.
   *
   * Omit for the overwhelming majority of cards, which have a single version.
   */
  variants?: CharacterVariant[]
}

/**
 * An alternate version of a character. Every field except `id` and `label` is a
 * *patch* over the base character: leave a field out and the base value shows
 * through. An alternate illustration of an otherwise identical card is
 * therefore just:
 *
 *   { id: 'liu-bei-alt-art', label: 'Alt art' }
 *
 * The `id` alone is what selects the different art, since it resolves to
 * `/cards/<id>.webp`. Nothing else needs restating.
 *
 * Note the difference between omitting a field and setting it: `abilities: []`
 * is an override to *no* abilities, whereas leaving `abilities` out inherits
 * the base card's. An explicit `undefined` also inherits.
 *
 * Resolve one against its base with `characterVersions` in src/lib/versions.ts —
 * don't read these fields directly in components.
 */
export interface CharacterVariant {
  /**
   * Stable slug, unique across the whole roster (not just within the character),
   * because it doubles as the image filename: /cards/<id>.webp. Convention is
   * `<character-id>-<variant>`, e.g. "example-warlord-forsaken".
   */
  id: string
  /** Short switcher label, e.g. "Forsaken", "Ascended", "2019 reprint". */
  label: string
  /** Overrides the base name outright when this version is renamed. */
  name?: string
  title?: string
  kingdom?: string
  health?: number
  gender?: Gender
  /** Replaces the base ability list wholesale — variants rarely share abilities. */
  abilities?: Ability[]
  image?: string
  flavor?: string
  /** Overrides the base pack when this printing shipped in a different one. */
  cardPack?: string
  /**
   * Extra search words for *this* printing's art — added to the base card's
   * rather than replacing them, since a search hit on any version has to lead
   * back to the one character either way.
   */
  searchTerms?: string
  modelLabel?: string
}

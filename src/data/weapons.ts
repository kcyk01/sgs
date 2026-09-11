import type {Weapon} from '../types/weapon'

/**
 * Weapon cards.
 *
 * ⚠ STARTING SET — check the names, ranges and effects against the edition you
 * are cataloguing before trusting them. They follow the same colloquial naming
 * as the rules text elsewhere in the data ("Elephants", "Arrows", "Bridge"),
 * which is a house convention, not a printed one.
 *
 * Conventions, as with characters:
 * - `id` is a kebab-case slug, unique among weapons.
 * - `name` is what rules text puts in brackets; `data/cards.ts` picks these up
 *   automatically, so `[Axe]` colours as equipment without a second entry.
 * - `description` takes the same markup as an ability — see `RulesText`.
 */
export const weapons: Weapon[] = [
  {
    id: 'crossbow',
    name: 'Crossbow',
    range: 1,
    description:
      'During your action phase, you can use an unlimited number of [Attack]',
  },
  {
    id: 'steel-sword',
    name: 'Steel Sword',
    range: 2,
    description:
      '(Enforced) When you use an [Attack] on another player, any equipped Armour Equipment will be ignored',
  },
  {
    id: 'twin-swords',
    name: 'Twin Swords',
    range: 2,
    description:
      'When you play an [Attack] on another player of a different gender, you can force them to first either discard a hand card or let you draw a card',
  },
  {
    id: 'ice-sword',
    name: 'Ice Sword',
    range: 2,
    description:
      'When your [Attack] is about to deal damage to another player and that player has cards, you may choose to not deal the damage and instead discard two of their cards',
  },
  {
    id: 'ancient-sword',
    name: 'Ancient Sword',
    range: 2,
    description:
      '(Enforced) When your [Attack] deals damage and the target player has no hand cards, the damage is increased by 1',
  },
  {
    id: 'serpent-spear',
    name: 'Serpent Spear',
    range: 3,
    description: 'You may use any two hand cards as an [Attack]',
  },
  {
    id: 'silver-lance',
    name: 'Silver Lance',
    range: 3,
    description: 'Outside of your turn, whenever you play a black-suited card, you can immediately target another player in your attack range to play a [Dodge] or they will suffer 1 damage from you',
  },
  {
    id: 'axe',
    name: 'Axe',
    range: 3,
    description:
      'When your [Attack] is negated by a [Dodge], you can discard any two cards (except the weapon itself) to force the damage',
  },
  {
    id: 'dragon-blade',
    name: 'Dragon Blade',
    range: 3,
    description:
      'When your [Attack] is negated by a [Dodge], you can immediately play another [Attack] on the same target',
  },
  {
    id: 'sky-halberd',
    name: 'Sky Halberd',
    range: 4,
    description:
      'When you play your last hand card as an [Attack], it may target up to three players',
  },
  {
    id: 'fire-fan',
    name: 'Fire Fan',
    range: 4,
    description:
      'You may convert your normal [Attack] into a [Fire Attack]',
  },
  {
    id: 'kirin-bow',
    name: 'Kirin Bow',
    range: 5,
    description:
      'When your [Attack] deals damage, you may also discard one of your target\'s horses',
  },
]

export const weaponById = new Map(weapons.map((w) => [w.id, w]))

if (import.meta.env.DEV) {
  // Same reasoning as the character id check: ids are keys and names are what
  // rules text resolves against, so a duplicate of either is silent otherwise.
  const seenIds = new Set<string>()
  const seenNames = new Set<string>()
  for (const weapon of weapons) {
    if (seenIds.has(weapon.id) || seenNames.has(weapon.name))
      console.warn(`[weapons] duplicate id or name: ${weapon.id}`)
    seenIds.add(weapon.id)
    seenNames.add(weapon.name)
  }
}

/**
 * Every card that rules text can reference, and what kind it is.
 *
 * Rules text uses one syntax for all of them — `[Attack]`, `[Chains]`,
 * `[Judgement Shield]` — and the colour is looked up here. Declaring the type
 * once per card, rather than at every mention, is the whole point: `[Attack]`
 * appears dozens of times across a full roster and any per-mention marker will
 * eventually be wrong somewhere.
 *
 * Add a card here before referencing it. An unregistered name still renders,
 * as a basic card, and warns in the dev console — which is what turns a typo
 * like `[Attak]` into something you notice.
 */
export type CardType = 'basic' | 'tool' | 'equipment'

/**
 * Name exactly as written inside the brackets. This is a starting set covering
 * what the roster references so far — extend it as cards come up, and correct
 * any naming that doesn't match the edition you're cataloguing.
 */
export const cardTypes: Record<string, CardType> = {
  // Basic cards.
  Attack: 'basic',
  Dodge: 'basic',
  Peach: 'basic',
  Wine: 'basic',

  // Tool cards.
  Chains: 'tool',
  Duel: 'tool',
  Void: 'tool',
  Blaze: 'tool',
  Elephants: 'tool',
  Arrows: 'tool',
  Steal: 'tool',
  Bridge: 'tool',
  Lightning: 'tool',
  "Skip Drawing Phase": 'tool',
  "Skip Action Phase": 'tool',

  // Equipment.
  'Judgement Shield': 'equipment',
}

/** Names already warned about, so a repeated typo logs once rather than per render. */
const warned = new Set<string>()

/**
 * Resolves a referenced card name to its type.
 *
 * Falls back to an exact match, then to the singular form, so "discard two
 * [Attacks]" doesn't need its own registry entry. Anything still unknown is
 * treated as a basic card and reported once in development.
 */
export function cardType(name: string): CardType {
  const exact = cardTypes[name]
  if (exact) return exact

  // Trailing plural: "[Attacks]" -> "Attack".
  const singular = name.endsWith('s') ? cardTypes[name.slice(0, -1)] : undefined
  if (singular) return singular

  if (import.meta.env.DEV && !warned.has(name)) {
    warned.add(name)
    console.warn(
      `[cards] "${name}" is referenced in rules text but not in cardTypes ` +
      `(src/data/cards.ts). Rendering it as a basic card. Typo, or a card ` +
      `that still needs registering?`,
    )
  }
  return 'basic'
}

/**
 * Release order of the card packs, which is the order players think of them in:
 * the base game first, then the four Wind/Fire/Forest/Mountain expansions in
 * the order they shipped, then the OKF reprint set.
 *
 * The strings must match `Character.cardPack` exactly — they come straight off
 * the cards, there is no pack table to key into. A pack that isn't listed here
 * sorts after every listed one rather than being dropped, so adding cards from
 * a new set still produces a sensible list before this file catches up.
 */
export const cardPackOrder: string[] = [
  'base',
  'wind 風',
  'fire 火',
  'forest 林',
  'mountain 山',
  'OKF 2011 將',
]

/** Sort rank of a pack; unknown packs rank last, cards with no pack after those. */
export function cardPackRank(pack: string | undefined): number {
  if (!pack) return cardPackOrder.length + 1
  const i = cardPackOrder.indexOf(pack)
  return i === -1 ? cardPackOrder.length : i
}

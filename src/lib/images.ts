import type { Character } from '../types/character'

/**
 * Card art lives in `public/cards/` and is referenced by convention:
 *   public/cards/<character-id>.webp
 * Set `Character.image` to override (e.g. a different extension or a CDN URL).
 */
export function cardImageUrl(character: Character): string {
  return character.image ?? `/cards/${character.id}.webp`
}

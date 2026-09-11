import type { Character } from '../types/character'

/**
 * Resolves a path in `public/` against the deployed base path.
 *
 * Vite rewrites asset URLs it can see at build time, but not string literals
 * like these — and the app is served from a subpath on GitHub Pages
 * (`/sgs/`), where a leading-slash URL would resolve to the wrong origin root.
 * `BASE_URL` is `/` in dev, so this is a no-op locally.
 */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}

/**
 * Card art lives in `public/cards/` and is referenced by convention:
 *   public/cards/<character-id>.webp
 * Set `Character.image` to override (e.g. a different extension or a CDN URL).
 * An override is used verbatim, so it can be an absolute URL to a CDN.
 */
export function cardImageUrl(character: Character): string {
  return character.image ?? assetUrl(`cards/${character.id}.webp`)
}

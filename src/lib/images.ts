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
 * Anything that has card art. Structural rather than a union of `Character |
 * CharacterVariant | Weapon`: art is keyed on the id alone, so a new card kind
 * gets thumbnails and the lightbox by having an id, without touching this file.
 */
export interface CardArtSource {
  /** Doubles as the art filename, which is why ids are unique across kinds. */
  id: string
  /** Bypasses the convention below — an arbitrary path or absolute CDN URL. */
  image?: string
}

/** Art components also need something to label the image with. */
export interface NamedCardArtSource extends CardArtSource {
  name: string
}

/**
 * Card art lives in `public/cards/` and is referenced by convention:
 *   public/cards/<card-id>.webp
 * Set `image` on the card to override (e.g. a different extension or a CDN URL).
 * An override is used verbatim, so it can be an absolute URL to a CDN.
 */
export function cardImageUrl(card: CardArtSource): string {
  return card.image ?? assetUrl(`cards/${card.id}.webp`)
}

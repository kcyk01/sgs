# Card images

**This folder is generated output — only `.webp` files belong here.** Everything
in `public/` is copied verbatim into `dist/`, so a stray PNG left here ships to
users alongside the WebP the app actually requests.

## Workflow

Drop scans in `art-source/` (any format sharp reads: PNG, JPEG, TIFF, AVIF),
then:

```
npm run images            # convert anything new or changed
npm run images -- --force # re-encode everything
```

That resizes to 600px wide and encodes WebP at quality 85 — expect ~95% off a
full-size PNG scan. `art-source/` is outside `public/`, so the originals are
never part of a build. See `scripts/build-card-images.mjs` for the flags.

## Naming

The output filename must match the card's `id` — that's the whole lookup, in
`src/lib/images.ts`:

```
public/cards/<id>.webp
```

Alternate versions use the **variant's** own `id`, not the character's, and
weapons use their `Weapon.id`. All three share one namespace, which is why the
ids have to be unique across the whole data set:

```
public/cards/liu-bei.webp            # base card
public/cards/liu-bei-forsaken.webp   # CharacterVariant.id
public/cards/axe.webp                # Weapon.id
```

Source filenames are slugified on the way through (`Liu_Bei.png` →
`liu-bei.webp`), so the id convention holds even if the scans are named
inconsistently.

Set `image` on the character, variant or weapon to bypass all of this and
point at an arbitrary path or CDN URL. Missing images fall back to an initials
placeholder, so art can be added incrementally.

## Sizing

600px wide covers 3x displays (the detail view renders at ~132pt). The detail
view and list thumb crop to 5:7 via `object-fit: cover`; the lightbox shows the
image uncropped, so the script resizes but never crops.

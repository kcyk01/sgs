/**
 * Favourited character ids, persisted in localStorage.
 *
 * A tiny external store rather than React context: favourites are toggled from
 * the detail page and read from the tab bar and the Favourites page, which sit
 * in different branches of the tree, and the value has to survive a reload —
 * the point of the feature is looking up the cards in play across a whole game.
 *
 * Ids are *base* character ids (the `/c/:id` route), not version ids: you
 * favourite a character, not one printing of it.
 */

const STORAGE_KEY = 'sgs:favourites'

const listeners = new Set<() => void>()

function read(): ReadonlySet<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((v): v is string => typeof v === 'string'))
  } catch {
    // Corrupt JSON, or storage blocked (private mode / disabled cookies).
    // Favourites are a convenience, so degrade to "none" rather than throw.
    return new Set()
  }
}

// Cached so `getFavourites` can hand `useSyncExternalStore` a stable reference:
// it only changes identity when the set actually changes.
let ids: ReadonlySet<string> = read()

function commit(next: ReadonlySet<string>): void {
  ids = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
  } catch {
    // Storage unavailable or full — keep the in-memory value for this session.
  }
  for (const listener of listeners) listener()
}

export function getFavourites(): ReadonlySet<string> {
  return ids
}

export function subscribeToFavourites(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function toggleFavourite(id: string): void {
  const next = new Set(ids)
  if (!next.delete(id)) next.add(id)
  commit(next)
}

export function clearFavourites(): void {
  if (ids.size === 0) return
  commit(new Set())
}

// Another tab (or the same app in a second window) changing favourites should
// show up here too — the storage event only fires in *other* documents.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return
    ids = read()
    for (const listener of listeners) listener()
  })
}

/**
 * Recently viewed character ids, most recent first, persisted in localStorage.
 *
 * Same external-store shape as `./favourites` and for the same reasons: it is
 * written from the detail page, read from the Favourites page, and has to
 * survive a reload. Only characters are tracked — weapons have no detail view
 * worth remembering.
 *
 * Ids are *base* character ids (the `/c/:id` route), so alternate printings of
 * one character collapse into a single entry.
 */

const STORAGE_KEY = 'sgs:recent'

/** How many ids we keep around; the Favourites page shows fewer. */
const LIMIT = 8

const listeners = new Set<() => void>()

function read(): readonly string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((v): v is string => typeof v === 'string')
      .slice(0, LIMIT)
  } catch {
    // Corrupt JSON, or storage blocked (private mode / disabled cookies).
    return []
  }
}

// Cached so `getRecentlyViewed` can hand `useSyncExternalStore` a stable
// reference: it only changes identity when the list actually changes.
let recent: readonly string[] = read()

function commit(next: readonly string[]): void {
  recent = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable or full — keep the in-memory value for this session.
  }
  for (const listener of listeners) listener()
}

export function getRecentlyViewed(): readonly string[] {
  return recent
}

export function subscribeToRecentlyViewed(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Moves `id` to the front, dropping the oldest ids past the limit. */
export function recordRecentlyViewed(id: string): void {
  // Re-viewing the card that is already at the front is the common case (a
  // reload, or swiping between printings) — skip the write and the re-render.
  if (recent[0] === id) return
  commit([id, ...recent.filter((other) => other !== id)].slice(0, LIMIT))
}

export function clearRecentlyViewed(): void {
  if (recent.length === 0) return
  commit([])
}

// Another tab (or the same app in a second window) viewing a card should show
// up here too — the storage event only fires in *other* documents.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return
    recent = read()
    for (const listener of listeners) listener()
  })
}

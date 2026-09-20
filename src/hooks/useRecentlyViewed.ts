import { useSyncExternalStore } from 'react'
import { getRecentlyViewed, subscribeToRecentlyViewed } from '../lib/recent'

/** Recently viewed character ids, most recent first, re-rendering on change. */
export function useRecentlyViewed(): readonly string[] {
  return useSyncExternalStore(
    subscribeToRecentlyViewed,
    getRecentlyViewed,
    getRecentlyViewed,
  )
}

import { useSyncExternalStore } from 'react'
import { getFavourites, subscribeToFavourites } from '../lib/favourites'

/** The set of favourited character ids, re-rendering on every change. */
export function useFavourites(): ReadonlySet<string> {
  return useSyncExternalStore(
    subscribeToFavourites,
    getFavourites,
    getFavourites,
  )
}

export function useIsFavourite(id: string): boolean {
  return useFavourites().has(id)
}

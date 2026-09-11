import type { Kingdom } from '../types/character'

/**
 * Add / rename kingdoms here. `id` values are referenced by Character.kingdom and
 * appear in filter URLs, so changing an id invalidates shared links.
 */
export const kingdoms: Kingdom[] = [
  { id: 'wei', name: 'Wei', color: '#4f8cff' },
  { id: 'shu', name: 'Shu', color: '#ff9f43' },
  { id: 'wu', name: 'Wu', color: '#3ec489' },
  { id: 'qun', name: 'Qun / Other', color: '#c2c6d4' },
]

export const kingdomById = new Map(kingdoms.map((k) => [k.id, k]))

export const kingdomByName = new Map(kingdoms.map((k) => [k.name, k]))

export function kingdomName(id: string): string {
  return kingdomById.get(id)?.name ?? id
}

export function kingdomColor(id: string): string {
  return kingdomById.get(id)?.color ?? 'var(--c-muted)'
}

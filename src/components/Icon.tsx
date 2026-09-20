/**
 * Tiny inline icon set. Inline SVG avoids an icon-font/sprite request and keeps
 * icons colorable via `currentColor`. Add paths as needed.
 */
const paths = {
  search: 'M10 3a7 7 0 1 0 4.19 12.6l4.1 4.1 1.42-1.41-4.1-4.1A7 7 0 0 0 10 3Zm0 2a5 5 0 1 1 0 10A5 5 0 0 1 10 5Z',
  close: 'M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.71 2.88 18.3 9.17 12 2.88 5.71 4.3 4.3l6.29 6.29 6.3-6.29 1.41 1.41Z',
  filter: 'M3 5h18v2H3V5Zm3 6h12v2H6v-2Zm3 6h6v2H9v-2Z',
  back: 'M15.4 4.6 14 3.2 5.2 12l8.8 8.8 1.4-1.4L8 12l7.4-7.4Z',
  cards: 'M4 5h10v14H4V5Zm12 2h4v12h-4V7Z',
  camera: 'M12 9.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM9 3l-1.5 2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.5L15 3H9Z',
  info: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z',
  heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z',
  'heart-outline':
    'M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3Zm-4.4 15.55-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05Z',
  expand: 'M4 4h6v2H6v4H4V4Zm10 0h6v6h-2V6h-4V4ZM6 14v4h4v2H4v-6h2Zm12 0h2v6h-6v-2h4v-4Z',
  male: 'M10 8a6 6 0 1 0 0 12 6 6 0 1 0 0-12Zm0 2a4 4 0 1 1 0 8 4 4 0 1 1 0-8ZM14 4h6v6h-2V7.4l-4 4-1.4-1.4L17.6 6H14V4Z',
  female: 'M12 3a6 6 0 1 0 0 12 6 6 0 1 0 0-12Zm0 2a4 4 0 1 1 0 8 4 4 0 1 1 0-8Zm-1 9h2v3h3v2h-3v3h-2v-3H8v-2h3v-3Z',
  'chevron-left': 'M14.7 6.4 13.3 5l-7 7 7 7 1.4-1.4L9.1 12l5.6-5.6Z',
  'chevron-right': 'M9.3 5 7.9 6.4l5.6 5.6-5.6 5.6L9.3 19l7-7-7-7Z',
} as const

export type IconName = keyof typeof paths

export function Icon({
  name,
  size = 20,
}: {
  name: IconName
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  )
}

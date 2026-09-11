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
  heart: 'M12 21s-8-4.6-8-10a4.8 4.8 0 0 1 8-3.5A4.8 4.8 0 0 1 20 11c0 5.4-8 10-8 10Z',
  expand: 'M4 4h6v2H6v4H4V4Zm10 0h6v6h-2V6h-4V4ZM6 14v4h4v2H4v-6h2Zm12 0h2v6h-6v-2h4v-4Z',
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

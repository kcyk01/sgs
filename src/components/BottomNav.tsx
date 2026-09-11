import { Link, useLocation } from 'react-router-dom'
import type { IconName } from './Icon'
import { Icon } from './Icon'

/**
 * `paths` rather than one `to`: the browse tab covers both card-type lists, so
 * it stays lit while the segmented switcher moves between them. The first entry
 * is where the tab navigates.
 *
 * Matching is exact on purpose — a detail page (`/c/:id`) lights no tab, since
 * it is a place you arrived at rather than a section you are in.
 */
const items: { paths: string[]; label: string; icon: IconName }[] = [
  { paths: ['/', '/weapons'], label: 'Cards', icon: 'cards' },
  { paths: ['/scan'], label: 'Scan', icon: 'camera' },
  { paths: ['/favourites'], label: 'Favourites', icon: 'heart' },
]

/**
 * Fixed bottom tab bar — thumb-reachable on phones, unlike a top nav or a
 * hamburger drawer. Height + safe-area inset are accounted for by the
 * `.app__main` bottom padding so nothing hides behind it.
 */
export function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav className="nav" aria-label="Main">
      {items.map((item) => {
        const current = item.paths.includes(pathname)
        return (
          <Link
            key={item.label}
            to={item.paths[0]}
            className="nav__link"
            aria-current={current ? 'page' : undefined}
          >
            <Icon name={item.icon} size={22} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

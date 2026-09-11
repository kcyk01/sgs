import { NavLink } from 'react-router-dom'
import type { IconName } from './Icon'
import { Icon } from './Icon'

const items: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Cards', icon: 'cards' },
  { to: '/scan', label: 'Scan', icon: 'camera' },
  { to: '/about', label: 'About', icon: 'info' },
]

/**
 * Fixed bottom tab bar — thumb-reachable on phones, unlike a top nav or a
 * hamburger drawer. Height + safe-area inset are accounted for by the
 * `.app__main` bottom padding so nothing hides behind it.
 */
export function BottomNav() {
  return (
    <nav className="nav" aria-label="Main">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          // `end` so "/" is only current on the list page itself.
          end={item.to === '/'}
          className="nav__link"
        >
          <Icon name={item.icon} size={22} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

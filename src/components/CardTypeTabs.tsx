import { NavLink } from 'react-router-dom'

/**
 * Switches the browse tab between card types.
 *
 * This is a segmented control rather than a fourth item in the bottom nav: the
 * tab bar is one entry per *task* (browse, scan, what's in play), and card
 * types are a subdivision of browsing. The game has tools, armour and horses
 * behind weapons; a tab each would outgrow the bar, whereas this row takes
 * another entry for free.
 */
const tabs: { to: string; label: string }[] = [
  { to: '/', label: 'Characters' },
  { to: '/weapons', label: 'Weapons' },
]

export function CardTypeTabs() {
  return (
    <nav className="segmented segmented--tabs" aria-label="Card type">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          // `end` so "/" isn't current while /weapons is open.
          end={tab.to === '/'}
          className="segmented__option"
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}

import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './Icon'

export function AppHeader({
  title,
  showBack = false,
  actions,
}: {
  title: string
  showBack?: boolean
  actions?: ReactNode
}) {
  const navigate = useNavigate()

  return (
    <header className="header">
      <div className="header__inner">
        {showBack && (
          <button
            type="button"
            className="header__back"
            // -1 keeps the list's scroll position and active filters.
            onClick={() => void navigate(-1)}
            aria-label="Go back"
          >
            <Icon name="back" size={22} />
          </button>
        )}
        <h1 className="header__title">{title}</h1>
        {actions && <div style={{ marginLeft: 'auto' }}>{actions}</div>}
      </div>
    </header>
  )
}

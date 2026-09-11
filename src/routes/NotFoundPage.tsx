import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'

export default function NotFoundPage() {
  return (
    <>
      <AppHeader title="Not found" showBack />
      <main className="app__main">
        <p className="empty">
          That card does not exist.
          <br />
          <Link className="btn btn--link" to="/">
            Back to all characters
          </Link>
        </p>
      </main>
    </>
  )
}

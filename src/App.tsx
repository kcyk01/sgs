import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { ScrollToTop } from './components/ScrollToTop'
import CharacterDetailPage from './routes/CharacterDetailPage'
import CharacterListPage from './routes/CharacterListPage'
import FavouritesPage from './routes/FavouritesPage'
import WeaponListPage from './routes/WeaponListPage'
import NotFoundPage from './routes/NotFoundPage'

/**
 * The scanner is lazy so the camera code — and later the ML runtime + weights —
 * stay out of the initial bundle. Most visits are "look up a card".
 */
const ScanPage = lazy(() => import('./routes/ScanPage'))

export default function App() {
  return (
    <div className="app">
      <ScrollToTop />
      <Suspense fallback={<p className="center-note">Loading…</p>}>
        <Routes>
          <Route path="/" element={<CharacterListPage />} />
          <Route path="/c/:id" element={<CharacterDetailPage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/weapons" element={<WeaponListPage />} />
          <Route path="/favourites" element={<FavouritesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <BottomNav />
    </div>
  )
}

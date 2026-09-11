import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * BrowserRouter does not reset scroll between routes. Scroll to top on forward
 * navigation only — on POP (back gesture) the browser restores the previous
 * offset, which is what you want when returning to a long card list.
 *
 * Keyed on pathname alone so typing in the search box (which only rewrites the
 * query string) never yanks the list.
 */
export function ScrollToTop() {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0)
  }, [pathname, navigationType])

  return null
}

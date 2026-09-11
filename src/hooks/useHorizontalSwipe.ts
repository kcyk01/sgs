import { useRef, useState } from 'react'

/** Past this many px of horizontal travel, releasing commits the swipe. */
const COMMIT_PX = 56
/** A drag shallower than this stays a tap, so swiping never eats a click. */
const TAP_SLOP_PX = 10
/**
 * Below this ratio of |dx| to |dy| the gesture is a vertical scroll, not a
 * swipe — we bail out and let the page scroll normally.
 */
const HORIZONTAL_RATIO = 1.2

export interface SwipeHandlers {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onPointerCancel: (e: React.PointerEvent) => void
}

export interface Swipe {
  /** Spread onto the element that should respond to the gesture. */
  handlers: SwipeHandlers
  /** Live horizontal offset in px while dragging, 0 otherwise. */
  dx: number
  /** True from the moment a drag passes the tap slop until pointer release. */
  dragging: boolean
  /**
   * True if the last pointer-up ended a real drag. Check this in the element's
   * `onClick` and bail — a pointer-up after a drag still fires a click, which
   * would otherwise open the lightbox at the end of every swipe.
   */
  consumedClick: () => boolean
}

/**
 * Horizontal drag-to-page gesture, built on pointer events so mouse, touch and
 * pen all work from one code path.
 *
 * The element needs `touch-action: pan-y` in CSS, otherwise the browser claims
 * horizontal touch movement for scrolling before React sees a single move event.
 */
export function useHorizontalSwipe({
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
}: {
  /** Dragging leftwards, i.e. "show me the next one". */
  onSwipeLeft: () => void
  onSwipeRight: () => void
  enabled?: boolean
}): Swipe {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  // Gesture bookkeeping lives in a ref: it changes on every pointermove and
  // must not re-render, and the handlers need to read it synchronously.
  const gesture = useRef<{
    id: number
    x: number
    y: number
    /** Set once we've decided this is a horizontal swipe and not a scroll. */
    locked: boolean
    /** Set once movement exceeds the tap slop, to swallow the trailing click. */
    moved: boolean
  } | null>(null)
  const clickBlocked = useRef(false)

  const end = (e: React.PointerEvent, commit: boolean) => {
    const g = gesture.current
    if (!g || g.id !== e.pointerId) return
    gesture.current = null
    clickBlocked.current = g.moved
    setDragging(false)
    setDx(0)
    if (!commit || !g.locked) return
    const travel = e.clientX - g.x
    if (travel <= -COMMIT_PX) onSwipeLeft()
    else if (travel >= COMMIT_PX) onSwipeRight()
  }

  return {
    dx,
    dragging,
    consumedClick: () => {
      const blocked = clickBlocked.current
      clickBlocked.current = false
      return blocked
    },
    handlers: {
      onPointerDown: (e) => {
        // Ignore secondary mouse buttons and second fingers mid-gesture, so a
        // pinch-to-zoom on the art doesn't register as a swipe.
        if (!enabled || gesture.current || (e.pointerType === 'mouse' && e.button !== 0))
          return
        // Clear any leftover suppression before it can eat this tap. Once a drag
        // takes pointer capture the trailing click retargets to the capturing
        // element, so the flag we set on release is never read — and would
        // otherwise sit there and swallow the *next* tap-to-enlarge.
        clickBlocked.current = false
        gesture.current = {
          id: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          locked: false,
          moved: false,
        }
      },
      onPointerMove: (e) => {
        const g = gesture.current
        if (!g || g.id !== e.pointerId) return
        const travel = e.clientX - g.x
        const drop = Math.abs(e.clientY - g.y)

        if (!g.locked) {
          if (Math.abs(travel) < TAP_SLOP_PX && drop < TAP_SLOP_PX) return
          if (Math.abs(travel) < drop * HORIZONTAL_RATIO) {
            // Vertical intent — abandon the gesture and leave the page scrolling.
            gesture.current = null
            return
          }
          g.locked = true
          g.moved = true
          // Keep receiving moves even if the finger leaves the element's box.
          e.currentTarget.setPointerCapture?.(e.pointerId)
          setDragging(true)
        }

        setDx(travel)
      },
      onPointerUp: (e) => end(e, true),
      onPointerCancel: (e) => end(e, false),
    },
  }
}

import { useHorizontalSwipe } from '../hooks/useHorizontalSwipe'
import type { CharacterVersion } from '../lib/versions'
import { CardThumb } from './CardThumb'
import { Icon } from './Icon'

/**
 * The detail page's card art, plus the swipe-between-alternate-versions gesture.
 *
 * Characters with a single version render exactly as before — no switcher, no
 * gesture, no extra chrome. The swipe is only wired up when there is somewhere
 * to swipe to, so a one-off drag on an ordinary card can't feel broken.
 */
export function CardArtPager({
  versions,
  index,
  onIndexChange,
  onZoom,
  hasArt,
  onArtMissing,
}: {
  versions: CharacterVersion[]
  index: number
  onIndexChange: (next: number) => void
  onZoom: () => void
  /** False when this version's art file is missing — hides zoom affordances. */
  hasArt: boolean
  onArtMissing: () => void
}) {
  const version = versions[index]
  const multi = versions.length > 1
  const canPrev = index > 0
  const canNext = index < versions.length - 1

  // Clamped, not wrapping: at the last version a further left-swipe should feel
  // like the end of the stack, not silently loop back to the original.
  const go = (delta: number) => {
    const next = index + delta
    if (next >= 0 && next < versions.length) onIndexChange(next)
  }

  const swipe = useHorizontalSwipe({
    onSwipeLeft: () => go(1),
    onSwipeRight: () => go(-1),
    enabled: multi,
  })

  // Damped follow, and stiffer still when dragging against an end stop — the
  // art moves enough to acknowledge the finger without implying a card is there.
  const resist = (swipe.dx < 0 && !canNext) || (swipe.dx > 0 && !canPrev) ? 0.18 : 0.45
  const offset = swipe.dragging ? swipe.dx * resist : 0

  return (
    <div className="art-pager">
      <div
        className="art-pager__stage"
        // `pan-y` is load-bearing: without it the browser hands horizontal
        // touch movement to the scroller and no pointermove ever arrives.
        style={{ touchAction: multi ? 'pan-y' : undefined }}
        {...(multi ? swipe.handlers : {})}
        // Arrow keys page versions while focus is anywhere in the art region.
        onKeyDown={(e) => {
          if (!multi) return
          if (e.key === 'ArrowLeft') {
            e.preventDefault()
            go(-1)
          } else if (e.key === 'ArrowRight') {
            e.preventDefault()
            go(1)
          }
        }}
      >
        <button
          type="button"
          className="detail__art-btn"
          style={{
            transform: offset ? `translateX(${offset}px)` : undefined,
            // Snap back instantly under the finger, ease out on release.
            transition: swipe.dragging ? 'none' : 'transform 220ms ease-out',
          }}
          onClick={() => {
            // A pointer-up that ended a drag still fires a click; swallow it so
            // every swipe doesn't finish by throwing open the lightbox.
            if (swipe.consumedClick()) return
            onZoom()
          }}
          disabled={!hasArt}
          aria-label={`Enlarge ${version.name} card art`}
        >
          <span className="detail__art-frame">
            <CardThumb
              // Remount per version so a missing-art fallback never carries
              // over to the next version, or to the next card viewed.
              key={version.id}
              card={version}
              className="detail__art"
              onLoadError={onArtMissing}
            />
            {hasArt && (
              <span className="detail__art-hint">
                <Icon name="expand" size={13} />
                Tap to enlarge
              </span>
            )}
          </span>
        </button>
      </div>

      {multi && (
        <div className="art-pager__switcher">
          <button
            type="button"
            className="art-pager__nav"
            onClick={() => go(-1)}
            disabled={!canPrev}
            aria-label="Previous version"
          >
            <Icon name="chevron-left" size={18} />
          </button>

          <div className="art-pager__meta">
            {/* Polite live region: swiping is silent for screen readers
                otherwise, since nothing here takes focus. */}
            <p className="art-pager__label" aria-live="polite">
              {version.label}
              <span className="art-pager__count">
                {' '}
                · {index + 1} of {versions.length}
              </span>
            </p>
            <div className="art-pager__dots">
              {versions.map((v, i) => (
                <button
                  key={v.id}
                  type="button"
                  className={`art-pager__dot${i === index ? ' art-pager__dot--on' : ''}`}
                  onClick={() => onIndexChange(i)}
                  aria-label={`Show ${v.label} version`}
                  aria-current={i === index}
                >
                  <span className="art-pager__dot-mark" />
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="art-pager__nav"
            onClick={() => go(1)}
            disabled={!canNext}
            aria-label="Next version"
          >
            <Icon name="chevron-right" size={18} />
          </button>
        </div>
      )}
    </div>
  )
}

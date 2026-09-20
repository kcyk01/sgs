import {useCallback, useEffect, useRef, useState} from 'react'
import {Link} from 'react-router-dom'
import {AppHeader} from '../components/AppHeader'
import {CardThumb} from '../components/CardThumb'
import {characterById} from '../data/characters'
import {characterVersions} from '../lib/versions'
import {ScanDebugPanel} from '../components/ScanDebugPanel'
import {nextFrameSize} from '../features/scan/model/frame'
import {MATCH_THRESHOLD, loadRecognizer} from '../features/scan/recognizer'
import {useLiveScan} from '../features/scan/useLiveScan'
import type {
  CardMatch,
  CardRecognizer,
  RecognizerStatus,
  ScanDebug,
} from '../features/scan/types'
import {useCamera} from '../features/scan/useCamera'
import type {Character} from '../types/character'
import type {CardArtSource} from '../lib/images'

/**
 * Camera scanner: frame the card, take a still, identify it.
 *
 * Two ways in, one result screen. The page identifies the card off the live
 * stream on its own, and the Capture button is always there for when it will
 * not converge — a card at an angle it keeps changing its mind about, or a user
 * who would rather just take the picture. Neither is a mode to be chosen: both
 * end in the same frozen still and the same ranked list, and nothing
 * auto-navigates.
 *
 * Live scanning is not there for speed. Its case is that sampling the stream is
 * the only way to get *several independent looks* at one card, so it accepts on
 * a vote across a window of frames rather than on any single one — see
 * ../features/scan/useLiveScan.ts. The shutter's case is the opposite and just
 * as real: one frame a human judged to be in focus, analysed on a ~200 ms budget
 * rather than the ~30 ms a sampling tick can afford, at higher resolution —
 * worth about 7 points of top-5 recall on the test photos.
 *
 * Recognition sits behind the `CardRecognizer` interface and is loaded lazily, so
 * this page is unaffected by how a card is actually identified — see
 * src/features/scan/README.md.
 */

type Phase = 'framing' | 'analyzing' | 'result'

interface Suggestion {
  match: CardMatch
  /** The card page this result links to. */
  character: Character
  /** The exact printing that matched, whose art the row shows. */
  printing: CardArtSource & { name: string }
}

/**
 * The card a match names, or null when it names one outside the roster.
 *
 * Shared by the result rows and the live preview so both show the same art for
 * the same match — resolving the printing through `characterVersions` rather
 * than building `{ id, name }` by hand keeps any per-version `image` override
 * working, and doing it in one place keeps the preview honest about what the
 * accepted row will look like.
 */
function resolveSuggestion(match: CardMatch): Suggestion | null {
  const character = characterById.get(match.characterId)
  if (!character) return null
  const versions = characterVersions(character)
  const printing = versions.find((v) => v.id === match.artId) ?? versions[0]
  return {match, character, printing}
}

export default function ScanPage() {
  const {videoRef, state, error, start, stop} = useCamera()
  const recognizerRef = useRef<CardRecognizer | null>(null)
  const stillRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<RecognizerStatus>('loading')
  const [phase, setPhase] = useState<Phase>('framing')
  const [matches, setMatches] = useState<CardMatch[]>([])
  // Debug Mode: show what the pipeline saw between shutter and ranking, and let
  // it be saved as an eval photo. Off by default and not persisted — it is a
  // tool for building `test-images/`, not a preference.
  const [debug, setDebug] = useState(false)
  const [artifacts, setArtifacts] = useState<ScanDebug | null>(null)

  // Load (or discover the absence of) the recognizer once.
  useEffect(() => {
    let cancelled = false
    loadRecognizer()
      .then((recognizer) => {
        if (cancelled) {
          recognizer?.dispose()
          return
        }
        recognizerRef.current = recognizer
        setStatus(recognizer ? 'ready' : 'unavailable')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
      recognizerRef.current?.dispose()
      recognizerRef.current = null
    }
  }, [])

  /**
   * Freeze the current frame onto the still canvas and release the camera.
   *
   * Shared by both paths: the shutter analyses what this returns, while live
   * mode has already reached its verdict and only needs the frame on screen.
   */
  const freeze = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    const video = videoRef.current
    const canvas = stillRef.current
    // readyState < 2 means no frame has decoded yet. Capturing here would freeze
    // a blank canvas and then confidently analyse nothing.
    if (!video || !canvas || video.readyState < 2) return null

    // Captured at the camera's own resolution rather than the displayed size:
    // the recognizer downsamples to its own working width, and starting from the
    // full frame keeps that its decision rather than the CSS layout's.
    //
    // Measured from the frame being drawn rather than from the element, because
    // on iOS the two part company every time the rear camera decides to change
    // lens — see `nextFrameSize`. The scaling form of `drawImage` rather than
    // the natural-size one for the same reason: if the size is wrong anyway
    // (no `requestVideoFrameCallback`), scaling the whole frame into the canvas
    // keeps the crop that follows proportionally right, where drawing at
    // natural size would clip or pad an edge and move it.
    const { width, height } = await nextFrameSize(video)
    if (width === 0 || height === 0) return null
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')?.drawImage(video, 0, 0, width, height)

    // The frame is already on the canvas, so the camera has nothing left to do.
    // Releasing it here turns the recording indicator off at the moment of the
    // shutter, rather than leaving a live feed running behind a still the user
    // is reading — which looks like the page is still watching them.
    stop()
    return canvas
  }, [stop, videoRef])

  const capture = useCallback(async () => {
    const recognizer = recognizerRef.current
    if (!recognizer) return
    const canvas = await freeze()
    if (!canvas) return

    setPhase('analyzing')
    try {
      // `inspect` runs the same pipeline and keeps the intermediates, so the
      // debug images are necessarily the ones that produced these matches. It is
      // optional on the interface, hence the fallback rather than an assertion.
      if (debug && recognizer.inspect) {
        const result = await recognizer.inspect(canvas)
        setMatches(result?.matches ?? [])
        setArtifacts(result?.debug ?? null)
      } else {
        setMatches(await recognizer.recognize(canvas))
        setArtifacts(null)
      }
    } catch {
      setMatches([])
      setArtifacts(null)
    }
    setPhase('result')
  }, [debug, freeze])

  /**
   * Live mode reached a verdict: show it the way a capture would.
   *
   * The still frozen here is the frame at accept time, ~450 ms after the
   * deciding tick — not one of the four frames that voted. Copying every tick to
   * a canvas would re-introduce the full-frame `drawImage` that handing the
   * `<video>` straight to the recognizer exists to avoid, and the still's job is
   * to show the user what they were pointing at, not to be evidence. The verdict
   * genuinely came from four frames rather than the one on screen.
   */
  const accept = useCallback(
    (voted: CardMatch[], votedDebug: ScanDebug | null) => {
      void freeze().then(() => {
        setMatches(voted)
        setArtifacts(votedDebug)
        setPhase('result')
      })
    },
    [freeze],
  )

  // Live scanning runs whenever there is a stream to sample, a framing screen to
  // sample it for, and a recognizer to sample it with — there is no switch. The
  // Capture button below is the manual path, not a separate mode, so nothing is
  // taken away by leaving this on. Shared with the hint, so the page cannot
  // claim to be looking during the moment before the recognizer loads.
  const scanning = state === 'live' && phase === 'framing' && status === 'ready'

  const {leading} = useLiveScan({
    video: videoRef,
    recognizer: recognizerRef,
    enabled: scanning,
    debug,
    onAccept: accept,
  })

  // Discarding a capture also clears its result. Otherwise the previous scan's
  // matches would sit next to a fresh preview, as though the new session had
  // already identified something.
  const discard = useCallback(() => {
    setMatches([])
    setArtifacts(null)
    setPhase('framing')
  }, [])

  // Capture stopped the camera, so going back to framing has to start it again.
  const retake = useCallback(() => {
    discard()
    void start()
  }, [discard, start])

  // Matches naming a card that is not in the roster cannot be linked to, so they
  // are dropped here rather than guarded at each render site. Resolving the
  // printing through `characterVersions` rather than building `{ id, name }` by
  // hand keeps any per-version `image` override working.
  const suggestions: Suggestion[] = matches.flatMap((match) => {
    const suggestion = resolveSuggestion(match)
    return suggestion ? [suggestion] : []
  })

  // The running best guess, shown as art and a name but no percentage: a number
  // that moves every tick invites the user to wait for it to look good instead
  // of holding the card still, which is the only thing that actually helps. The
  // art is the point — it is the one part of a guess a user can check at a
  // glance, and the same 52px thumb they will confirm on a second later.
  const guess = leading ? resolveSuggestion(leading) : null

  const confident =
    suggestions.length > 0 && suggestions[0].match.confidence >= MATCH_THRESHOLD
  const showStill = phase !== 'framing'

  return (
    <>
      <AppHeader title="Scan a card"/>
      <main className="app__main">
        <div className="scan">
          {/* Above the viewport because it changes what a capture produces, not
              how a result is displayed — reading it after pressing Capture would
              be too late. */}
          <label className="scan__toggle">
            <input
              type="checkbox"
              checked={debug}
              onChange={(e) => setDebug(e.target.checked)}
            />
            <span>Debug Mode</span>
            <span className="muted scan__toggle-hint">
              show and save what the scanner saw
            </span>
          </label>

          <div className="scan__viewport">
            <video
              ref={videoRef}
              className="scan__video"
              // Required on iOS: inline playback, no audio.
              playsInline
              muted
              hidden={state !== 'live' || showStill}
            />
            <canvas ref={stillRef} className="scan__still" hidden={!showStill}/>
            {state === 'live' && !showStill && <div className="scan__reticle"/>}
            {state !== 'live' && !showStill && (
              <p className="scan__placeholder">
                {state === 'starting'
                  ? 'Starting camera…'
                  : (error ??
                    'Line a card up inside the guide and hold still — it is identified automatically, or press Capture.')}
              </p>
            )}
          </div>

          {state !== 'live' && !showStill && (
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => void start()}
              disabled={state === 'starting'}
            >
              {state === 'denied' ? 'Try again' : 'Start camera'}
            </button>
          )}

          {/* Deliberately outside the `aria-live` region below: this changes
              every ~450 ms, and announcing each tick would bury the one
              announcement that matters. The result is what gets read out. */}
          {scanning && (
            <div className="scan__guess">
              {guess && (
                <CardThumb
                  // Keyed on the printing, so one card's missing art cannot
                  // leave its initials placeholder showing for the next guess.
                  key={guess.printing.id}
                  card={guess.printing}
                  className="card-row__thumb"
                />
              )}
              <p className="muted scan__guess-text">
                {guess ? (
                  <>
                    Looking for a card… best guess so far:{' '}
                    <strong>{guess.character.name}</strong>
                  </>
                ) : (
                  'Looking for a card… hold it steady inside the guide.'
                )}
              </p>
            </div>
          )}

          {state === 'live' && phase === 'framing' && (
            <>
              <button
                type="button"
                className="btn btn--primary btn--block"
                onClick={() => void capture()}
                disabled={status !== 'ready'}
              >
                Capture
              </button>
              <button type="button" className="btn btn--block" onClick={stop}>
                Stop camera
              </button>
            </>
          )}

          {showStill && (
            <button
              type="button"
              className="btn btn--block"
              onClick={retake}
              disabled={phase === 'analyzing'}
            >
              {phase === 'analyzing' ? 'Identifying…' : 'Retake'}
            </button>
          )}

          {status === 'unavailable' && (
            <p className="muted" style={{fontSize: '0.875rem'}}>
              Card recognition is unavailable on this device — the camera preview
              works, but cards are not identified. Use{' '}
              <Link to="/" style={{color: 'var(--c-accent)'}}>
                search
              </Link>{' '}
              instead.
            </p>
          )}

          {status === 'error' && (
            <p className="muted" style={{fontSize: '0.875rem'}}>
              The card recogniser failed to load.
            </p>
          )}

          {/* Every candidate is listed, with the art that matched, because the
              quickest way to confirm a scan is to look at the picture — a name
              and a percentage ask the user to trust a number instead. Only a
              once-analysed still can do this: under a live feed the ranking
              reshuffled every frame and was unreadable. */}
          <div aria-live="polite">
            {phase === 'result' && (
              <p className="scan__verdict">
                {suggestions.length === 0
                  ? 'No card found. Fill more of the guide and try again.'
                  : confident
                    ? 'Best match — tap to open, or pick another below.'
                    : 'Not sure about that one. Closest matches:'}
              </p>
            )}

            {phase === 'result' && suggestions.length > 0 && (
              <ol className="scan__results">
                {suggestions.map(({match, character, printing}, index) => (
                  <li key={match.characterId}>
                    <Link
                      to={`/c/${character.id}`}
                      className={`card-row scan__result${
                        index === 0 && confident ? ' scan__result--lead' : ''
                      }`}
                    >
                      <CardThumb
                        // Keyed on the printing so a failed image in one row
                        // does not leak its fallback into the next scan's row.
                        key={printing.id}
                        card={printing}
                        className="card-row__thumb"
                      />
                      <div className="card-row__body">
                        <div className="card-row__name">{character.name}</div>
                        {character.title && (
                          <div className="card-row__title">{character.title}</div>
                        )}
                      </div>
                      <span className="scan__score">
                        {Math.round(match.confidence * 100)}%
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Named after the top match so a correct scan downloads a file that
              drops straight into `test-images/`; a wrong one needs renaming,
              which is the same work as naming it from scratch. */}
          {debug && artifacts && (
            <ScanDebugPanel
              debug={artifacts}
              stem={matches[0]?.characterId ?? 'scan'}
            />
          )}
        </div>
      </main>
    </>
  )
}

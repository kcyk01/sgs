import {useCallback, useEffect, useRef, useState} from 'react'
import {Link} from 'react-router-dom'
import {AppHeader} from '../components/AppHeader'
import {CardThumb} from '../components/CardThumb'
import {characterById} from '../data/characters'
import {characterVersions} from '../lib/versions'
import {ScanDebugPanel} from '../components/ScanDebugPanel'
import {MATCH_THRESHOLD, loadRecognizer} from '../features/scan/recognizer'
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
 * Deliberately a shutter rather than a live feed. Continuously sampling a moving
 * camera spends most of its frames on motion blur and half-framed cards, and the
 * result label flickers between near-tied candidates while the user is still
 * lining the card up. Freezing one frame the user chose is steadier and easier to
 * reason about: what got analysed is exactly what they can see.
 *
 * It also buys accuracy. A one-shot analysis has a ~200 ms budget instead of the
 * ~10 ms a 4 fps loop could afford, which is spent capturing at higher
 * resolution — worth about 7 points of top-5 recall on the test photos.
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

  const capture = useCallback(async () => {
    const recognizer = recognizerRef.current
    const video = videoRef.current
    const canvas = stillRef.current
    // readyState < 2 means no frame has decoded yet. Capturing here would freeze
    // a blank canvas and then confidently analyse nothing.
    if (!recognizer || !video || !canvas || video.readyState < 2) return

    // Captured at the camera's own resolution rather than the displayed size:
    // the recognizer downsamples to its own working width, and starting from the
    // full frame keeps that its decision rather than the CSS layout's.
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)

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
  }, [debug, videoRef])

  const retake = useCallback(() => {
    setMatches([])
    setArtifacts(null)
    setPhase('framing')
  }, [])

  // Stopping the camera discards the capture too. Otherwise restarting it would
  // surface the previous scan's result next to a fresh preview, as though the
  // new session had already identified something.
  const stopCamera = useCallback(() => {
    retake()
    stop()
  }, [retake, stop])

  // Matches naming a card that is not in the roster cannot be linked to, so they
  // are dropped here rather than guarded at each render site. Resolving the
  // printing through `characterVersions` rather than building `{ id, name }` by
  // hand keeps any per-version `image` override working.
  const suggestions: Suggestion[] = matches.flatMap((match) => {
    const character = characterById.get(match.characterId)
    if (!character) return []
    const versions = characterVersions(character)
    const printing = versions.find((v) => v.id === match.artId) ?? versions[0]
    return [{match, character, printing}]
  })

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
            {state !== 'live' && (
              <p className="scan__placeholder">
                {state === 'starting'
                  ? 'Starting camera…'
                  : (error ??
                    'Line a card up inside the guide, then take a picture of it.')}
              </p>
            )}
          </div>

          {state !== 'live' && (
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => void start()}
              disabled={state === 'starting'}
            >
              {state === 'denied' ? 'Try again' : 'Start camera'}
            </button>
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
              <button type="button" className="btn btn--block" onClick={stopCamera}>
                Stop camera
              </button>
            </>
          )}

          {state === 'live' && showStill && (
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

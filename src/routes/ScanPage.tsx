import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { characterById } from '../data/characters'
import {
  MATCH_THRESHOLD,
  SAMPLE_INTERVAL_MS,
  loadRecognizer,
} from '../features/scan/recognizer'
import type { CardMatch, CardRecognizer, RecognizerStatus } from '../features/scan/types'
import { useCamera } from '../features/scan/useCamera'

/**
 * Camera scanner. The capture pipeline is complete and the recognition step is
 * behind the `CardRecognizer` interface, so this page needs no changes when the
 * trained model lands — see src/features/scan/README.md.
 */
export default function ScanPage() {
  const { videoRef, state, error, start, stop } = useCamera()
  const recognizerRef = useRef<CardRecognizer | null>(null)
  const [status, setStatus] = useState<RecognizerStatus>('loading')
  const [match, setMatch] = useState<CardMatch | null>(null)

  // Load (or discover the absence of) the model once.
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

  // Sample frames while the camera is live and a model is loaded.
  useEffect(() => {
    if (state !== 'live' || status !== 'ready') return
    let running = true

    const timer = window.setInterval(() => {
      const recognizer = recognizerRef.current
      const video = videoRef.current
      if (!recognizer || !video || video.readyState < 2) return
      void recognizer
        .recognize(video)
        .then((matches) => {
          if (!running) return
          const best = matches[0]
          setMatch(best && best.confidence >= MATCH_THRESHOLD ? best : null)
        })
        .catch(() => {
          /* Ignore a single bad frame; the next tick retries. */
        })
    }, SAMPLE_INTERVAL_MS)

    return () => {
      running = false
      window.clearInterval(timer)
    }
  }, [state, status, videoRef])

  const matched = match ? characterById.get(match.characterId) : undefined

  return (
    <>
      <AppHeader title="Scan a card" />
      <main className="app__main">
        <div className="scan">
          <div className="scan__viewport">
            <video
              ref={videoRef}
              className="scan__video"
              // Required on iOS: inline playback, no audio.
              playsInline
              muted
              hidden={state !== 'live'}
            />
            {state === 'live' && <div className="scan__reticle" />}
            {state !== 'live' && (
              <p className="scan__placeholder">
                {state === 'starting'
                  ? 'Starting camera…'
                  : (error ??
                    'Point your rear camera at a card to identify it.')}
              </p>
            )}
          </div>

          {state === 'live' ? (
            <button type="button" className="btn btn--block" onClick={stop}>
              Stop camera
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => void start()}
              disabled={state === 'starting'}
            >
              {state === 'denied' ? 'Try again' : 'Start camera'}
            </button>
          )}

          {status === 'unavailable' && (
            <p className="muted" style={{ fontSize: '0.875rem' }}>
              Recognition model not installed yet — the camera preview works, but
              cards are not identified. Until then, use{' '}
              <Link to="/" style={{ color: 'var(--c-accent)' }}>
                search
              </Link>
              .
            </p>
          )}

          {status === 'error' && (
            <p className="muted" style={{ fontSize: '0.875rem' }}>
              The recognition model failed to load.
            </p>
          )}

          {matched && match && (
            <Link className="btn btn--primary btn--block" to={`/c/${matched.id}`}>
              {matched.name} · {Math.round(match.confidence * 100)}%
            </Link>
          )}
        </div>
      </main>
    </>
  )
}

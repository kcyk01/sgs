import { useCallback, useEffect, useRef, useState } from 'react'

export type CameraState = 'idle' | 'starting' | 'live' | 'denied' | 'error'

/**
 * Rear-camera access for the scanner.
 *
 * Notes that bit us on mobile and are handled here:
 * - getUserMedia requires a secure context: https:// or localhost. Use
 *   `vite --host` + a tunnel (or `vite preview` over https) to test on a phone.
 * - The stream must be stopped explicitly, or the camera LED stays on after the
 *   user navigates away.
 * - Playback needs `muted` + `playsInline` on the <video> or iOS goes fullscreen.
 */
export function useCamera(): {
  videoRef: React.RefObject<HTMLVideoElement | null>
  state: CameraState
  error: string | null
  start: () => Promise<void>
  stop: () => void
} {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [state, setState] = useState<CameraState>('idle')
  const [error, setError] = useState<string | null>(null)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setState('idle')
  }, [])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('error')
      setError('This browser does not support camera access.')
      return
    }
    setState('starting')
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          // "environment" = rear camera, which is what you point at a card.
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setState('live')
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setState('denied')
        setError('Camera permission was denied.')
      } else {
        setState('error')
        setError(err instanceof Error ? err.message : 'Could not start the camera.')
      }
    }
  }, [])

  // Always release the camera when the page unmounts.
  useEffect(() => stop, [stop])

  return { videoRef, state, error, start, stop }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LIVE_AGREEMENT,
  LIVE_CONFIDENCE,
  LIVE_TICK_MS,
  LIVE_WINDOW,
} from './recognizer'
import type { CardMatch, CardRecognizer, ScanDebug } from './types'

/**
 * Live scanning: identify a card off the camera stream, without a shutter.
 *
 * Runs whenever the scan page is framing. It does not replace the shutter —
 * `ScanPage` keeps Capture available throughout, for the card this never settles
 * on — so the bar here is not "better than nothing", it is "trustworthy enough
 * to assert a result the user did not ask for".
 *
 * This exists for one reason, and it is not speed. `confidenceOf` in
 * `pipeline/match.ts` is a softmax over the top-5 — it measures separation from
 * the runner-up, not probability of correctness — so a single blurred frame can
 * clear 0.90 on a lucky gap between two candidates. Accepting on one sampled
 * frame would be strictly worse than the shutter, which at least analyses a
 * frame a human judged to be in focus.
 *
 * What a live feed can have and a shutter structurally cannot is *several
 * independent looks* at the card. So this accepts nothing until one card has led
 * `LIVE_AGREEMENT` of the last `LIVE_WINDOW` ticks with a mean confidence over
 * `LIVE_CONFIDENCE` — four pieces of evidence rather than one good frame.
 *
 * Cost is not the constraint: a tick hands the `<video>` element straight to the
 * recognizer, whose `reticleRegion()` crop reads the video's own dimensions, so
 * there is no full-frame `drawImage` at all. One tick is ~30-50 ms of main
 * thread on a phone, at ~2 ticks a second. The camera being on costs more.
 */

/** One sampled frame's outcome: its ranking, and its intermediates in Debug Mode. */
export interface LiveTick {
  /** Ranked matches for that frame, or empty if it found nothing. */
  matches: CardMatch[]
  /** That tick's artifacts when Debug Mode is on, else null. */
  debug: ScanDebug | null
}

/** A card that won the vote, with the evidence that carried it. */
export interface LiveVerdict {
  characterId: string
  /** Mean confidence across the ticks that agreed — the number accepted on. */
  confidence: number
  /**
   * The ranking from the most confident agreeing tick, shown verbatim.
   *
   * Deliberately one tick's list rather than a per-card average: the rows are
   * read as "here is what the scanner scored", and an averaged list is a ranking
   * that no frame ever actually produced.
   */
  matches: CardMatch[]
  /** That same tick's artifacts, so Debug Mode shows the images that decided it. */
  debug: ScanDebug | null
}

/**
 * The accept rule, as a pure function: does this window agree on a card?
 *
 * Separate and exported so the one decision that makes live mode defensible can
 * be reasoned about — and checked — without a camera, a DOM or React.
 *
 * A card must lead at least `LIVE_AGREEMENT` of the ticks in `window`, and the
 * mean confidence of *those* ticks must reach `LIVE_CONFIDENCE`. Only the top
 * match of each tick votes: a card that keeps placing second is exactly the
 * near-tie this rule exists to reject.
 */
export function tallyVotes(window: LiveTick[]): LiveVerdict | null {
  if (window.length < LIVE_AGREEMENT) return null

  const byCard = new Map<string, LiveTick[]>()
  for (const tick of window) {
    const lead = tick.matches[0]
    if (!lead) continue
    const votes = byCard.get(lead.characterId)
    if (votes) votes.push(tick)
    else byCard.set(lead.characterId, [tick])
  }

  let best: LiveVerdict | null = null
  for (const [characterId, votes] of byCard) {
    if (votes.length < LIVE_AGREEMENT) continue
    const confidence =
      votes.reduce((sum, tick) => sum + tick.matches[0].confidence, 0) / votes.length
    if (confidence < LIVE_CONFIDENCE) continue
    // The deciding tick: the agreeing frame that was surest, since that is the
    // one whose ranking and debug images are worth putting on screen.
    const deciding = votes.reduce((a, b) =>
      b.matches[0].confidence > a.matches[0].confidence ? b : a,
    )
    // Two cards cannot both lead 3 of 4, so this comparison never bites at the
    // shipped constants — but the rule should not quietly depend on them.
    if (!best || confidence > best.confidence)
      best = { characterId, confidence, matches: deciding.matches, debug: deciding.debug }
  }
  return best
}

export type LiveStatus = 'idle' | 'looking' | 'accepted'

/**
 * Samples the live stream and calls `onAccept` once a window of ticks agrees.
 *
 * Sampling is driven by `requestVideoFrameCallback` rather than a bare
 * `setInterval`, throttled to `LIVE_TICK_MS`: ticking off frames the compositor
 * actually presented means never analysing a stale decoded frame, and rVFC does
 * not fire on a hidden tab, so a backgrounded page stops looking for free.
 * Falls back to `setTimeout` where it is unsupported — the same capability check
 * `nextFrameSize` makes.
 */
export function useLiveScan({
  video,
  recognizer,
  enabled,
  debug,
  onAccept,
}: {
  video: React.RefObject<HTMLVideoElement | null>
  recognizer: React.RefObject<CardRecognizer | null>
  enabled: boolean
  debug: boolean
  onAccept: (matches: CardMatch[], debug: ScanDebug | null) => void
}): { status: LiveStatus; leading: CardMatch | null } {
  /**
   * What the loop has seen so far, written only from a completed tick.
   *
   * Not a `status` plus a `leading` reset when the loop starts: an effect that
   * sets state in its own body is a cascading render. The previous run's result
   * is retired by the render-time adjustment below instead.
   */
  const [seen, setSeen] = useState<{
    leading: CardMatch | null
    accepted: boolean
  } | null>(null)

  // Switching the loop back on — Retake, or Live Mode re-ticked — starts a new
  // run, and the last one's verdict is history. Switching it *off* keeps the
  // result: accepting is what disables the loop, so clearing here would make
  // `'accepted'` the one status that could never be observed.
  const [ran, setRan] = useState(enabled)
  if (ran !== enabled) {
    setRan(enabled)
    if (enabled) setSeen(null)
  }

  // Held in a ref so a changing callback identity cannot restart the loop and
  // throw away a half-filled window.
  const onAcceptRef = useRef(onAccept)
  useEffect(() => {
    onAcceptRef.current = onAccept
  }, [onAccept])

  const analyze = useCallback(
    async (frame: HTMLVideoElement): Promise<LiveTick> => {
      const current = recognizer.current
      if (!current) return { matches: [], debug: null }
      try {
        // Same branch as the shutter: `inspect` keeps the intermediates, so the
        // debug images belong to the frame that produced these matches.
        if (debug && current.inspect) {
          const result = await current.inspect(frame)
          return { matches: result?.matches ?? [], debug: result?.debug ?? null }
        }
        return { matches: await current.recognize(frame), debug: null }
      } catch {
        return { matches: [], debug: null }
      }
    },
    [debug, recognizer],
  )

  useEffect(() => {
    const element = video.current
    if (!enabled || !element) return

    let stopped = false
    let inFlight = false
    let recent: LiveTick[] = []
    let last = 0
    let frameHandle: number | null = null
    let timer: ReturnType<typeof setTimeout> | null = null

    const schedule = () => {
      if (stopped) return
      if (typeof element.requestVideoFrameCallback === 'function')
        frameHandle = element.requestVideoFrameCallback(onFrame)
      else timer = setTimeout(() => onFrame(performance.now()), LIVE_TICK_MS)
    }

    const onFrame = (now: number) => {
      frameHandle = null
      timer = null
      if (stopped) return
      // rVFC fires at the display rate, so most of those frames are dropped
      // here. A tick already in flight reschedules from its own completion and
      // never from this branch, so ticks can neither overlap nor double-queue.
      if (inFlight) return
      // readyState < 2 means nothing has decoded yet: there is no frame to read.
      if (now - last < LIVE_TICK_MS || element.readyState < 2) {
        schedule()
        return
      }
      last = now
      inFlight = true
      void analyze(element)
        .then((tick) => {
          if (stopped) return
          recent = [...recent, tick].slice(-LIVE_WINDOW)
          const verdict = tallyVotes(recent)
          setSeen({leading: tick.matches[0] ?? null, accepted: verdict !== null})
          if (!verdict) return
          // Stop before handing the verdict over: `onAccept` freezes the frame
          // and stops the camera, and a tick started in between would be
          // analysing a stream that is on its way out.
          stopped = true
          onAcceptRef.current(verdict.matches, verdict.debug)
        })
        .finally(() => {
          inFlight = false
          schedule()
        })
    }

    schedule()

    return () => {
      stopped = true
      if (frameHandle !== null) element.cancelVideoFrameCallback?.(frameHandle)
      if (timer !== null) clearTimeout(timer)
    }
  }, [analyze, enabled, video])

  return {
    status: seen?.accepted ? 'accepted' : enabled ? 'looking' : 'idle',
    leading: enabled ? (seen?.leading ?? null) : null,
  }
}

import type { Candidate } from './match.ts'

/**
 * Temporal voting over consecutive frames.
 *
 * The cheapest accuracy in the whole pipeline. A single frame can be ruined by
 * motion blur, a glare highlight across the artwork, a finger over a corner, or
 * an autofocus hunt — all of them transient, and all of them capable of producing
 * a confidently wrong answer. Requiring the same card to win several frames in a
 * row costs one small array and rides straight over every one of those, because
 * the failures are uncorrelated frame to frame while the right answer is not.
 *
 * It also fixes a UI problem: without it the result label flickers between
 * near-tied candidates on every tick, which reads as broken even when the top
 * answer is right most of the time.
 */

export interface VoteWindow {
  /** Feeds one frame's result in and returns the stable answer, if there is one. */
  push(candidate: Candidate | null): Candidate | null
  /** Forgets history — call when the camera restarts. */
  reset(): void
}

export interface VoteOptions {
  /** Frames remembered. At ~4 fps, 5 frames is a ~1.25 s decision window. */
  size?: number
  /**
   * How many of those frames must agree. 3 of 5 tolerates two bad frames while
   * still needing a clear majority; requiring all 5 makes the scanner feel
   * unresponsive in exactly the hand-held conditions it is built for.
   */
  minAgreement?: number
}

export function createVoteWindow({
  size = 5,
  minAgreement = 3,
}: VoteOptions = {}): VoteWindow {
  let history: (Candidate | null)[] = []

  return {
    push(candidate) {
      history.push(candidate)
      if (history.length > size) history.shift()

      // Frames that matched nothing still occupy a slot. That is intentional:
      // they are evidence against a decision, so a card half out of frame has to
      // work harder to win than one that is simply ambiguous.
      const votes = new Map<string, Candidate[]>()
      for (const entry of history) {
        if (!entry) continue
        const bucket = votes.get(entry.characterId)
        if (bucket) bucket.push(entry)
        else votes.set(entry.characterId, [entry])
      }

      let winner: Candidate[] | null = null
      for (const bucket of votes.values())
        if (!winner || bucket.length > winner.length) winner = bucket

      if (!winner || winner.length < minAgreement) return null

      const mean =
        winner.reduce((sum, entry) => sum + entry.confidence, 0) / winner.length

      return {
        ...winner[winner.length - 1],
        // Unanimity reports the frames' own mean confidence; a bare majority is
        // discounted toward 80% of it. Agreement is corroboration, so it should
        // move the number — but it is not independent evidence, so it should not
        // move it far.
        confidence: mean * (0.5 + 0.5 * (winner.length / size)),
      }
    },

    reset() {
      history = []
    },
  }
}

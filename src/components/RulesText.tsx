import type { ReactNode } from 'react'
import { kingdoms } from '../data/kingdoms'
import { CardRef } from './CardRef'
import { KingdomRef } from './KingdomRef'

/**
 * Rules text gets several bits of inline markup:
 *
 *   'Another Shu character may play an [Attack] to remove your [Chains].'
 *              ^^^ kingdom, auto        ^^^^^^ card    ^^^^^^^^ also a card
 *
 * Both cards above render in different colours — basic vs. tool vs. equipment
 * comes from the registry in `data/cards.ts`, not from the markup, so there is
 * exactly one card syntax to remember.
 *
 * Plus a newline for a forced line break, which is what makes numbered and
 * bulleted rules readable:
 *
 *   'The target cannot [Dodge] if:\n1. they are far away\n2. they hold 2+ cards'
 *
 * Card references are explicit — anything in square brackets. Kingdom names are
 * detected automatically from `data/kingdoms.ts`, since requiring markup for a
 * fixed list of proper nouns is just a chore that gets forgotten.
 *
 * A backslash escapes the next character, which is the way out of both:
 * `\\[` prints a literal bracket, and `\\Wu` prints a plain "Wu". That second
 * one matters — "Wu" is a kingdom *and* a common name element ("Wu Guotai"), so
 * auto-detection will occasionally be wrong and needs an opt-out.
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Longest-first so a kingdom whose name prefixes another can't shadow it.
const KINGDOM_ALTERNATION = kingdoms
  .map((k) => k.name)
  .sort((a, b) => b.length - a.length)
  .map(escapeRegExp)
  .join('|')

/**
 * Order matters: the escape wins over everything, then bracketed card refs, then
 * bare kingdom names. That ordering is what keeps a kingdom named *inside* a
 * card reference — `[Shu Attack]` — from being split apart.
 *
 * Card refs stop at a newline or a nested bracket, so an unclosed `[` degrades
 * to plain text instead of swallowing the rest of the paragraph. Kingdom names
 * match case-sensitively and on word boundaries, so "shudder" and lowercase
 * prose are left alone.
 */
const TOKEN_SOURCE = String.raw`\\(.)|\[([^[\]\n]+)\]|\b(${KINGDOM_ALTERNATION})\b`

/**
 * `<br>` in the source is accepted and treated exactly as `\n`. The data is
 * never parsed as HTML — rendering it that way would mean `dangerouslySetInnerHTML`
 * and hand-auditing every description — but a stray `<br/>` typed out of habit
 * should produce a line break rather than print itself as literal text.
 */
const BR_TAG = /<br\s*\/?>/gi

/** A line that opens with `1.`, `2)`, `-` or `•` — rendered with a hanging indent. */
const LIST_MARKER = /^\s*(?:[-•*]|\d+[.)])\s+/

/** Splits one line into plain strings, `CardRef`s and `KingdomRef`s. */
function parseInline(text: string): ReactNode[] {
  const token = new RegExp(TOKEN_SOURCE, 'g')
  const out: ReactNode[] = []
  let last = 0

  for (let m = token.exec(text); m; m = token.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1]) out.push(m[1]) // escaped character — emit it bare
    else if (m[2]) out.push(<CardRef key={m.index} name={m[2]} />)
    else out.push(<KingdomRef key={m.index} name={m[3]} />)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))

  return out
}

/**
 * Renders rules text with its references marked up. Returns a fragment, not a
 * paragraph, so callers keep control of the wrapping element and its class.
 */
export function RulesText({ text }: { text: string }) {
  const lines = text
    .replace(BR_TAG, '\n')
    .split('\n')
    // Drop blank lines: spacing between lines is the stylesheet's job, so a
    // stray double newline in the data shouldn't open a gap.
    .filter((line) => line.trim() !== '')

  // The overwhelmingly common single-line case stays a plain inline run, with
  // no wrapper element to affect layout.
  if (lines.length <= 1) return <>{parseInline(lines[0] ?? '')}</>

  return (
    <>
      {lines.map((line, i) => (
        <span
          key={i}
          className={
            LIST_MARKER.test(line) ? 'rules__line rules__line--item' : 'rules__line'
          }
        >
          {parseInline(line)}
        </span>
      ))}
    </>
  )
}

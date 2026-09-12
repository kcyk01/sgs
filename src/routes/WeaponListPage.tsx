import { useMemo, useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { CardLightbox } from '../components/CardLightbox'
import { CardThumb } from '../components/CardThumb'
import { CardTypeTabs } from '../components/CardTypeTabs'
import { Icon } from '../components/Icon'
import { RulesText } from '../components/RulesText'
import { weaponById, weapons } from '../data/weapons'

/**
 * Every weapon, grouped by range.
 *
 * No search, no filter sheet and no detail route: the whole set is a couple of
 * screens, and a weapon is three short lines. Making each one a row that has to
 * be tapped open would add navigation to something that fits on the page —
 * mid-game, the answer to "what does the Axe do" should already be on screen.
 *
 * Art is on the row rather than behind a tap for the same reason: the common
 * question is "which of these is the card in their hand", which is answered by
 * looking, not by reading. Tapping the art opens it full-screen to compare
 * against the physical card.
 *
 * Range leads the grouping because that's the other question the table asks
 * ("can I reach them?"); the effect is the tiebreaker you read after.
 */
export default function WeaponListPage() {
  const groups = useMemo(() => {
    const byRange = new Map<number, typeof weapons>()
    for (const weapon of [...weapons].sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const bucket = byRange.get(weapon.range)
      if (bucket) bucket.push(weapon)
      else byRange.set(weapon.range, [weapon])
    }
    return [...byRange.entries()].sort(([a], [b]) => a - b)
  }, [])

  // Which card is open, by id, so the viewer needs no reset when the list
  // changes. Art can be missing per weapon while the set is being photographed,
  // so the enlarge affordance is tracked as a set rather than a flag.
  const [zoomedId, setZoomedId] = useState<string | null>(null)
  const [artMissing, setArtMissing] = useState<ReadonlySet<string>>(new Set())
  const zoomed = zoomedId ? weaponById.get(zoomedId) : undefined

  return (
    <>
      <AppHeader title="Weapons" />
      <main className="app__main">
        <CardTypeTabs />

        {weapons.length === 0 ? (
          <p className="empty">No weapons recorded yet.</p>
        ) : (
          groups.map(([range, items]) => (
            <section className="list-group" key={range}>
              <h2 className="list-group__header">
                <span>Range {range}</span>
                <span>{items.length}</span>
              </h2>
              <div className="list">
                {items.map((weapon) => {
                  const hasArt = !artMissing.has(weapon.id)
                  return (
                    <article className="weapon" key={weapon.id}>
                      <button
                        type="button"
                        className="weapon__art"
                        onClick={() => setZoomedId(weapon.id)}
                        disabled={!hasArt}
                        aria-label={`Enlarge ${weapon.name} card art`}
                      >
                        <CardThumb
                          card={weapon}
                          className="weapon__thumb"
                          onLoadError={() =>
                            setArtMissing((prev) =>
                              new Set(prev).add(weapon.id),
                            )
                          }
                        />
                        {hasArt && (
                          <span className="weapon__zoom" aria-hidden="true">
                            <Icon name="expand" size={13} />
                          </span>
                        )}
                      </button>
                      <div className="weapon__body">
                        <div className="weapon__head">
                          <h3 className="weapon__name">{weapon.name}</h3>
                          <span className="chip weapon__range">
                            Range {weapon.range}
                          </span>
                        </div>
                        <p className="ability__text">
                          <RulesText text={weapon.description} />
                        </p>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {zoomed && (
        <CardLightbox
          card={zoomed}
          open
          onClose={() => setZoomedId(null)}
          caption={`${zoomed.name} · Range ${zoomed.range}`}
        />
      )}
    </>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { CardArtPager } from '../components/CardArtPager'
import { CardLightbox } from '../components/CardLightbox'
import { FavouriteButton } from '../components/FavouriteButton'
import { HealthBadge } from '../components/HealthBadge'
import { KingdomChip } from '../components/KingdomChip'
import { RulesText } from '../components/RulesText'
import { characterById } from '../data/characters'
import { characterVersions } from '../lib/versions'
import NotFoundPage from './NotFoundPage'

export default function CharacterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const character = id ? characterById.get(id) : undefined

  // Alternate printings of this character, base card first. Length 1 for most.
  const versions = useMemo(
    () => (character ? characterVersions(character) : []),
    [character],
  )
  // Keyed by version *id* rather than index, for the same reason the zoom state
  // is: React Router reuses this component across /c/:id changes, and an id
  // belonging to the previous card falls back to 0 on its own rather than
  // stranding the reader on "version 3" of a card that has one.
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null)
  const activeIndex = Math.max(
    0,
    versions.findIndex((v) => v.id === activeVersionId),
  )
  const version = versions[activeIndex]

  // Track *which* card is zoomed rather than a boolean: comparing against the
  // current id closes the viewer whenever the route or version changes, without
  // a resetting effect.
  const [zoomedId, setZoomedId] = useState<string | null>(null)
  // Same id-keyed trick, as a set: art can be missing for one version of a
  // character and present for another, so "tap to enlarge" is offered per
  // version rather than per card.
  const [artMissing, setArtMissing] = useState<ReadonlySet<string>>(new Set())
  const hasArt = version ? !artMissing.has(version.id) : false

  // No prev/next pager here on purpose: the roster has no meaningful order, so
  // stepping through it card-by-card is noise. Back to the list is the only way
  // out, which keeps the list's scroll position and filters intact.

  useEffect(() => {
    if (version) document.title = `${version.name} · Card Codex`
    return () => {
      document.title = 'Card Codex'
    }
  }, [version])

  if (!character || !version) return <NotFoundPage />

  return (
    <>
      {/* Header follows the visible version — a renamed variant should not sit
          under the base card's name. */}
      {/* The heart is keyed to the character, not the shown version, so
          switching printings never looks like it un-favourited the card. */}
      <AppHeader
        title={version.name}
        showBack
        actions={<FavouriteButton id={character.id} />}
      />
      <main className="app__main">
        {/* Name and stats sit above the art so the art can be full-width and
            still leave the abilities section reachable in one short scroll. */}
        <div className="detail__head">
          <h2 className="detail__name">{version.name}</h2>
          {version.title && <p className="detail__title">{version.title}</p>}
          <div className="detail__stats">
            <HealthBadge health={version.health} />
            <Link to={`/?kingdom=${version.kingdom}`}>
              <KingdomChip id={version.kingdom} />
            </Link>
          </div>
        </div>

        <CardArtPager
          versions={versions}
          index={activeIndex}
          onIndexChange={(i) => setActiveVersionId(versions[i].id)}
          onZoom={() => setZoomedId(version.id)}
          hasArt={hasArt}
          onArtMissing={() =>
            setArtMissing((prevSet) => new Set(prevSet).add(version.id))
          }
        />

        <section className="section">
          <h3 className="section__title">
            {version.abilities.length === 1 ? 'Ability' : 'Abilities'}
          </h3>
          {version.abilities.length === 0 ? (
            <p className="muted">No abilities recorded yet.</p>
          ) : (
            version.abilities.map((ability) => (
              <article className="ability" key={ability.name}>
                <h4 className="ability__name">{ability.name}</h4>
                <p className="ability__text">
                  <RulesText text={ability.description} />
                </p>
                {ability.tags && ability.tags.length > 0 && (
                  <div className="ability__tags">
                    {ability.tags.map((tag) => (
                      // Tapping a tag jumps back to the list filtered by it.
                      <Link key={tag} to={`/?tag=${encodeURIComponent(tag)}`}>
                        <span className="chip">{tag}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </article>
            ))
          )}
        </section>

        {version.flavor && (
          <section className="section">
            <h3 className="section__title">Lore</h3>
            <p className="flavor">{version.flavor}</p>
          </section>
        )}
      </main>

      <CardLightbox
        card={version}
        open={zoomedId === version.id}
        onClose={() => setZoomedId(null)}
        caption={
          versions.length > 1 ? `${version.name} · ${version.label}` : version.name
        }
      />
    </>
  )
}

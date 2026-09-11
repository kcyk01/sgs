import { AppHeader } from '../components/AppHeader'
import { characters } from '../data/characters'
import { kingdoms } from '../data/kingdoms'

/** Placeholder for game rules / credits text. Replace the copy below. */
export default function AboutPage() {
  return (
    <>
      <AppHeader title="About" />
      <main className="app__main">
        <section className="section">
          <h3 className="section__title">This app</h3>
          <p className="ability__text">
            A reference for the {characters.length} character cards in the game.
            Replace this text with an introduction, rules summary, or credits.
          </p>
        </section>

        <section className="section">
          <h3 className="section__title">Kingdoms</h3>
          <div className="stack">
            {kingdoms.map((k) => (
              <article className="ability" key={k.id}>
                <h4 className="ability__name">
                  <span
                    className="chip__dot"
                    style={{ background: k.color, display: 'inline-block' }}
                  />{' '}
                  {k.name}
                </h4>
                <p className="ability__text">
                  {k.description ?? 'Add a description for this kingdom.'}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}

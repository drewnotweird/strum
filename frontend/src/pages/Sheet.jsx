import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ChordDiagram from '../components/ChordDiagram.jsx'
import { chordLabel, playable } from '../data/chords.js'
import { barsOf, getSong } from '../lib/song.js'
import { go } from '../lib/transition.js'
import { glyph } from '../lib/strum.js'
import { strumFor } from '../data/strums.js'
import { setEasyChords, useStore } from '../lib/store.js'


// The whole song on one page: every section's chords bar by bar, the shapes and the
// strum patterns. Good for looking ahead, and it prints for a music stand.
export default function Sheet() {
  const { id } = useParams()
  const navigate = useNavigate()
  const song = getSong(id)
  const easy = useStore((st) => st.easyChords)

  useEffect(() => {
    if (!song) return
    document.title = `${song.title} chords · Strum`
    return () => { document.title = 'Strum' }
  }, [song])

  if (!song) {
    return (
      <main className="missing">
        <p>Can't find that song.</p>
        <Link to="/">Back to the songs</Link>
      </main>
    )
  }

  const shown = (raw) => playable(raw.split('|')[0], easy)
  const shapes = [...new Set(song.form.flatMap((key) => song.sections[key].steps.map(shown)))]
  const allTokens = Object.values(song.patterns).join(' ')
  // Each pattern the song uses, named for people: its trainer name if it has one, otherwise
  // the parts of the song that use it
  const used = new Map()
  song.form.forEach((key) => {
    const section = song.sections[key]
    section.steps.forEach((raw) => {
      const name = raw.split('|')[1] || song.defaultPattern
      if (!used.has(name)) used.set(name, new Set())
      used.get(name).add(section.name)
    })
  })
  const patternLabel = (name) => strumFor(song.patterns[name])?.name || [...used.get(name)].join(' · ')
  const back = `/song/${song.id}`

  return (
    <main className="tool sheet">
      <header className="player__head">
        <Link to={back} className="back" aria-label={`Back to ${song.title}`} onClick={(e) => { e.preventDefault(); go(navigate, back, 'back') }}>←</Link>
        <div className="player__title">
          <h1>{song.title}</h1>
          <p>
            {song.artist}
            {song.capo > 0 && ` · capo ${song.capo}`}
            {` · ${song.bpm} bpm`}
          </p>
        </div>
        <button className="btn btn--toggle sheet__print" onClick={() => window.print()}>Print</button>
      </header>

      <section className="tool__section">
        <h2>Chords</h2>
        <ul className="sheet__shapes">
          {shapes.map((name) => (
            <li key={name}>
              <span>{chordLabel(name)}</span>
              <ChordDiagram name={name} className="diagram--sheet" />
            </li>
          ))}
        </ul>
        <button className={`btn btn--toggle sheet__easy ${easy ? 'is-on' : ''}`} onClick={() => setEasyChords(!easy)} aria-pressed={easy}>
          Easy chords
        </button>
      </section>

      <section className="tool__section">
        <h2>Strumming</h2>
        <ul className="sheet__patterns">
          {[...used.keys()].map((name) => [name, song.patterns[name]]).map(([name, pattern]) => (
            <li key={name}>
              {used.size > 1 && <span className="sheet__pattern-name">{patternLabel(name)}</span>}
              <span className="sheet__pattern" aria-label={pattern}>
                {pattern.split(/\s+/).map((t, k) => (
                  <span key={k} className={t === 'M' ? 'is-muted' : t === 'X' ? 'is-chuck' : ''}>
                    {glyph(t)}{t === 'M' && <small>PM</small>}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
        {(allTokens.includes('X') || allTokens.includes('M')) && (
          <p className="sheet__legend">
            {allTokens.includes('X') && <span>× is a chuck: land your strumming hand flat on the strings.</span>}
            {allTokens.includes('M') && <span>↓PM is a palm-muted down-strum: rest your hand on the strings by the bridge.</span>}
          </p>
        )}
      </section>

      <section className="tool__section">
        <h2>The song</h2>
        <ol className="sheet__sections">
          {song.form.map((key, i) => {
            const section = song.sections[key]
            const bars = barsOf(song, section.steps).map((bar) => bar.map((c) => chordLabel(playable(c, easy))))
            return (
              <li key={i} className="sheet__section">
                <h3>
                  {section.name}
                  {section.repeat > 1 && <span className="sheet__repeat"> ×{section.repeat}</span>}
                  {section.cue && <span className="sheet__cue">{section.cue}</span>}
                </h3>
                <div className="sheet__bars">
                  {bars.map((bar, b) => (
                    <span key={b} className="sheet__bar">{bar.join(' ')}</span>
                  ))}
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      {song.notes && <p className="sheet__notes">{song.notes}</p>}
    </main>
  )
}

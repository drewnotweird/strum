import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ChordDiagram from '../components/ChordDiagram.jsx'
import { chordLabel } from '../data/chords.js'
import { CHORD_GROUPS, chordTitle } from '../data/chordGroups.js'
import { songs } from '../lib/song.js'
import { playChord } from '../lib/audio.js'
import { go } from '../lib/transition.js'

// How many songs use each chord, by name, so the number matches what the search finds
// (the Wonderwall G shape counts as G, like it does in the search)
const songCount = {}
songs.forEach((song) => {
  const names = new Set(Object.values(song.sections).flatMap((sec) => sec.steps.map((raw) => chordLabel(raw.split('|')[0]))))
  names.forEach((c) => { songCount[c] = (songCount[c] || 0) + 1 })
})

export default function Chords() {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Chords · Strum'
    return () => { document.title = 'Strum' }
  }, [])

  // Tapping a chord shows the song list searched for it (the search box understands chord names)
  const showSongs = (name) => go(navigate, `/?q=${encodeURIComponent(chordLabel(name))}`, 'forward')

  return (
    <main className="tool">
      <header className="player__head">
        <Link to="/" className="back" aria-label="All songs" onClick={(e) => { e.preventDefault(); go(navigate, '/', 'back') }}>←</Link>
        <div className="player__title">
          <h1>Chords</h1>
          <p>Tap a chord to see the songs that use it</p>
        </div>
      </header>

      {CHORD_GROUPS.map((group) => (
        <section key={group.name} className="tool__section">
          <h2>{group.name}</h2>
          <ul className="chord-grid">
            {group.chords.map((name) => {
              const count = songCount[chordLabel(name)] || 0
              const body = (
                <>
                  <span className="chord-card__name">{chordTitle(name)}</span>
                  <ChordDiagram name={name} className="diagram--card" />
                  <span className="chord-card__count">
                    {count ? `In ${count} ${count === 1 ? 'song' : 'songs'} →` : 'Not in any songs yet'}
                  </span>
                </>
              )
              return (
                <li key={name} className="chord-card">
                  {count ? (
                    <Link
                      to={`/?q=${encodeURIComponent(chordLabel(name))}`}
                      className="chord-card__link"
                      onClick={(e) => {
                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                        e.preventDefault()
                        showSongs(name)
                      }}
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="chord-card__link is-unused">{body}</div>
                  )}
                  <button className="chord-card__hear" onClick={() => playChord(name)} aria-label={`Hear ${chordTitle(name)}`}>
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" />
                      <path className="wave" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
                    </svg>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </main>
  )
}

import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ChordDiagram from '../components/ChordDiagram.jsx'
import { CHORD_GROUPS, chordTitle } from '../data/chordGroups.js'
import { songs } from '../lib/song.js'
import { playChord } from '../lib/audio.js'
import { go } from '../lib/transition.js'

// Which songs use each chord shape (the first few are listed under each chord)
const SHOW_SONGS = 3
const usedIn = {}
songs.forEach((song) => {
  const names = new Set(Object.values(song.sections).flatMap((sec) => sec.steps.map((raw) => raw.split('|')[0])))
  names.forEach((c) => (usedIn[c] ||= []).push(song))
})

export default function Chords() {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Chords · Strum'
    return () => { document.title = 'Strum' }
  }, [])

  return (
    <main className="tool">
      <header className="player__head">
        <Link to="/" className="back" aria-label="All songs" onClick={(e) => { e.preventDefault(); go(navigate, '/', 'back') }}>←</Link>
        <div className="player__title">
          <h1>Chords</h1>
          <p>Tap a chord to hear it</p>
        </div>
      </header>

      {CHORD_GROUPS.map((group) => (
        <section key={group.name} className="tool__section">
          <h2>{group.name}</h2>
          <ul className="chord-grid">
            {group.chords.map((name) => (
              <li key={name} className="chord-card">
                <button className="chord-card__play" onClick={() => playChord(name)} aria-label={`Hear ${chordTitle(name)}`}>
                  <span className="chord-card__name">{chordTitle(name)}</span>
                  <ChordDiagram name={name} className="diagram--card" />
                </button>
                {usedIn[name] && (
                  <p className="chord-card__songs">
                    {usedIn[name].slice(0, SHOW_SONGS).map((song, i) => (
                      <span key={song.id}>
                        {i > 0 && ', '}
                        <Link
                          to={`/song/${song.id}`}
                          onClick={(e) => { e.preventDefault(); go(navigate, `/song/${song.id}`, 'forward') }}
                        >
                          {song.title}
                        </Link>
                      </span>
                    ))}
                    {usedIn[name].length > SHOW_SONGS && ` and ${usedIn[name].length - SHOW_SONGS} more`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}

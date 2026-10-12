import { useLayoutEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useNavigationType } from 'react-router-dom'
import { songs } from '../lib/song.js'
import { chordLabel } from '../data/chords.js'
import { artistTransitionName, go, listReady, titleTransitionName } from '../lib/transition.js'

const levels = { 1: 'Easy', 2: 'Medium', 3: 'Tricky' }

const songChords = (song) => {
  const names = new Set()
  Object.values(song.sections).forEach((s) => s.steps.forEach((raw) => names.add(chordLabel(raw.split('|')[0]))))
  return [...names]
}

const catalogue = songs.map((song) => {
  const chords = songChords(song)
  return {
    song,
    chords,
    chordSet: new Set(chords.map((c) => c.toLowerCase())),
    text: `${song.title} ${song.artist}`.toLowerCase(),
  }
})

const allChords = new Set(catalogue.flatMap((s) => [...s.chordSet]))

// A song matches if its title or artist contains the query, or if the query is
// a list of chords and the song uses nothing but those chords.
function search(query, level) {
  const q = query.trim().toLowerCase()
  const tokens = q.split(/[\s,]+/).filter(Boolean)
  const chordQuery = tokens.length > 0 && tokens.every((t) => allChords.has(t)) ? new Set(tokens) : null

  const results = catalogue.filter((entry) => {
    if (level && entry.song.level !== level) return false
    if (!q) return true
    if (entry.text.includes(q)) return true
    return chordQuery && [...entry.chordSet].every((c) => chordQuery.has(c))
  })
  return { results, chordQuery }
}

// Kept outside the component so the search survives a trip to a song and back
const remembered = { query: '', level: null }

export default function Home() {
  const navigate = useNavigate()
  const navigationType = useNavigationType()
  const [query, setQueryState] = useState(remembered.query)
  const [level, setLevelState] = useState(remembered.level)
  const setQuery = (q) => setQueryState((remembered.query = q))
  const setLevel = (l) => setLevelState((remembered.level = l))

  // Coming back from a song (our back arrow or the browser's): restore the scroll
  // position and let a waiting page transition finish
  useLayoutEffect(() => {
    if (navigationType === 'POP') listReady()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const { results, chordQuery } = useMemo(() => search(query, level), [query, level])

  return (
    <main className="home">
      <header className="home__head">
        <div className="home__title">
          <h1>Strum</h1>
          <svg className="burst" viewBox="0 0 64 64" aria-hidden="true">
            <line x1="22" y1="8" x2="28" y2="20" />
            <line x1="6" y1="22" x2="20" y2="32" />
            <line x1="4" y1="46" x2="20" y2="48" />
          </svg>
        </div>
        <p>Pick a song. Play the chord in the big box, and get ready for the next one.</p>
      </header>

      <div className="filter">
        <label className="search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <line x1="15.5" y1="15.5" x2="21" y2="21" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Song, band, or chords like G C D"
            aria-label="Search songs"
            autoComplete="off"
            spellCheck="false"
          />
          {query && (
            <button className="search__clear" onClick={() => setQuery('')} aria-label="Clear search">×</button>
          )}
        </label>
        <div className="levels" role="group" aria-label="Filter by level">
          {Object.entries(levels).map(([n, name]) => (
            <button
              key={n}
              className={`level-filter level-filter--${n} ${level === Number(n) ? 'is-on' : ''}`}
              onClick={() => setLevel(level === Number(n) ? null : Number(n))}
              aria-pressed={level === Number(n)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {chordQuery && (
        <p className="filter__hint">
          Songs you can play with {[...chordQuery].map((c) => chordLabel(c.charAt(0).toUpperCase() + c.slice(1))).join(', ')}
        </p>
      )}

      {results.length === 0 ? (
        <p className="empty">No songs match. Try fewer letters, or add a chord you know.</p>
      ) : (
        <ul className="songs">
          {results.map(({ song, chords }) => (
            <li key={song.id}>
              <Link
                to={`/song/${song.id}`}
                className="song-card"
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                  e.preventDefault()
                  go(navigate, `/song/${song.id}`, 'forward')
                }}
              >
                <span className="song-card__top">
                  <span className="song-card__title" style={titleTransitionName(song.id)}>{song.title}</span>
                  <span className={`level level--${song.level}`}>{levels[song.level]}</span>
                </span>
                <span className="song-card__artist">
                  <span>
                    <span style={artistTransitionName(song.id)}>{song.artist}</span>
                    {song.kind === 'drill' ? ' · warm-up drill' : ''}
                  </span>
                  {song.capo > 0 && <span className="badge">Capo {song.capo}</span>}
                </span>
                <span className="song-card__chords">
                  {chords.map((c) => <span key={c} className="mini-chord">{c}</span>)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

import { useLayoutEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useNavigationType } from 'react-router-dom'
import { songs } from '../lib/song.js'
import { chordLabel } from '../data/chords.js'
import { artistTransitionName, go, listReady, titleTransitionName } from '../lib/transition.js'
import { practisedToday, setLefty, streakOf, useStore } from '../lib/store.js'

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
function search(query, level, learnedOnly, learned) {
  const q = query.trim().toLowerCase()
  const tokens = q.split(/[\s,]+/).filter(Boolean)
  const chordQuery = tokens.length > 0 && tokens.every((t) => allChords.has(t)) ? new Set(tokens) : null

  const results = catalogue.filter((entry) => {
    if (level && entry.song.level !== level) return false
    if (learnedOnly && !learned.includes(entry.song.id)) return false
    if (!q) return true
    if (entry.text.includes(q)) return true
    return chordQuery && [...entry.chordSet].every((c) => chordQuery.has(c))
  })
  return { results, chordQuery }
}

// Kept outside the component so the search survives a trip to a song and back
const remembered = { query: '', level: null, learnedOnly: false }

const TOOLS = [
  { to: '/tuner', name: 'Tuner', blurb: 'Get every string in tune', icon: 'M12 3v10M7 8l5 5 5-5M5 19h14' },
  { to: '/changes', name: 'Chord changes', blurb: 'Practise switching between two chords', icon: 'M4 8h13l-3-3M20 16H7l3 3' },
  { to: '/chords', name: 'Chords', blurb: 'Every shape, tap to hear it', icon: 'M6 4v16M10 4v16M14 4v16M18 4v16M4 8h16M4 12h16' },
]

export default function Home() {
  const navigate = useNavigate()
  const navigationType = useNavigationType()
  const [query, setQueryState] = useState(remembered.query)
  const [level, setLevelState] = useState(remembered.level)
  const setQuery = (q) => setQueryState((remembered.query = q))
  const setLevel = (l) => setLevelState((remembered.level = l))
  const [learnedOnly, setLearnedOnlyState] = useState(remembered.learnedOnly)
  const setLearnedOnly = (v) => setLearnedOnlyState((remembered.learnedOnly = v))
  const learned = useStore((st) => st.learned)
  const days = useStore((st) => st.days)
  const lefty = useStore((st) => st.lefty)
  const streak = streakOf(days)

  // Coming back from a song (our back arrow or the browser's): restore the scroll
  // position and let a waiting page transition finish
  useLayoutEffect(() => {
    if (navigationType === 'POP') listReady()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const { results, chordQuery } = useMemo(
    () => search(query, level, learnedOnly, learned),
    [query, level, learnedOnly, learned]
  )

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
        <div className="progress">
          <span className={`streak ${streak > 0 ? 'is-going' : ''}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z" />
            </svg>
            {streak > 0
              ? `${streak}-day streak${practisedToday(days) ? '' : ': play today to keep it'}`
              : 'Play a song to start a streak'}
          </span>
          {learned.length > 0 && (
            <span className="learned-count">✓ {learned.length} {learned.length === 1 ? 'song' : 'songs'} learned</span>
          )}
        </div>
      </header>

      <nav className="tools" aria-label="Practice tools">
        {TOOLS.map((tool) => (
          <Link
            key={tool.to}
            to={tool.to}
            className="tool-card"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
              e.preventDefault()
              go(navigate, tool.to, 'forward')
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={tool.icon} /></svg>
            <span className="tool-card__name">{tool.name}</span>
            <span className="tool-card__blurb">{tool.blurb}</span>
          </Link>
        ))}
      </nav>

      <div className="filter">
        <label className="search">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
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
          <button
            className={`level-filter level-filter--learned ${learnedOnly ? 'is-on' : ''}`}
            onClick={() => setLearnedOnly(!learnedOnly)}
            aria-pressed={learnedOnly}
          >
            ✓ Learned
          </button>
        </div>
      </div>

      <h2 className="sr-only">Songs</h2>
      <p className="sr-only" aria-live="polite">
        {query || level || learnedOnly ? `${results.length} ${results.length === 1 ? 'song' : 'songs'} found` : ''}
      </p>

      {chordQuery && (
        <p className="filter__hint">
          Songs you can play with {[...chordQuery].map((c) => chordLabel(c.charAt(0).toUpperCase() + c.slice(1))).join(', ')}
        </p>
      )}

      {results.length === 0 ? (
        <p className="empty">
          {learnedOnly && learned.length === 0
            ? 'No songs learned yet. When you can play one, tap "I can play this!" on its page.'
            : 'No songs match. Try fewer letters, or add a chord you know.'}
        </p>
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
                  <span className="song-card__badges">
                    {learned.includes(song.id) && <span className="tick" aria-label="Learned">✓</span>}
                    <span className={`level level--${song.level}`}>{levels[song.level]}</span>
                  </span>
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

      <footer className="home__foot">
        <button className={`btn btn--toggle ${lefty ? 'is-on' : ''}`} onClick={() => setLefty(!lefty)} aria-pressed={lefty}>
          Left-handed chord diagrams
        </button>
      </footer>
    </main>
  )
}

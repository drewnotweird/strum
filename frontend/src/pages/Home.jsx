import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useNavigationType } from 'react-router-dom'
import { songs } from '../lib/song.js'
import { makeCatalogue, search } from '../lib/search.js'
import { chordLabel } from '../data/chords.js'
import { artistTransitionName, go, listReady, titleTransitionName } from '../lib/transition.js'
import { cycleGoal, practisedToday, secondsToday, setEasyChords, setLefty, streakOf, useStore } from '../lib/store.js'
import { BADGES } from '../lib/badges.js'

const levels = { 1: 'Easy', 2: 'Medium', 3: 'Tricky' }

const index = makeCatalogue(songs)

const capitalise = (c) => chordLabel(c.charAt(0).toUpperCase() + c.slice(1))

// Kept outside the component so the search survives a trip to a song and back
const remembered = { query: '', level: null, learnedOnly: false }

// Icons drawn on a 24×24 grid, matching the pages they open
const TOOLS = [
  {
    to: '/tuner',
    name: 'Tuner',
    blurb: 'Get every string in tune',
    // A tuning meter: the arc, its centre mark, and the needle
    icon: (
      <>
        <path d="M3.5 17a8.5 8.5 0 0 1 17 0" />
        <path d="M12 6.5v2" />
        <path d="M12 17l3.5-6" />
        <circle className="fill" cx="12" cy="17" r="1.8" />
      </>
    ),
  },
  {
    to: '/changes',
    name: 'Chord changes',
    blurb: 'Practise switching between two chords',
    // Round and round between two chords
    icon: (
      <>
        <path d="M4 11V9.5A3.5 3.5 0 0 1 7.5 6H19" />
        <path d="M16 3l3 3-3 3" />
        <path d="M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H5" />
        <path d="M8 21l-3-3 3-3" />
      </>
    ),
  },
  {
    to: '/chords',
    name: 'Chords',
    blurb: 'Every shape, tap to hear it',
    // A little chord diagram: a thick nut, thin strings and frets, two finger dots
    icon: (
      <>
        <path d="M4.5 4.5h15" strokeWidth="3" />
        <path className="thin" d="M4.5 4.5v15M9.5 4.5v15M14.5 4.5v15M19.5 4.5v15M4.5 10h15M4.5 15h15" />
        <circle className="fill" cx="9.5" cy="12.5" r="2" />
        <circle className="fill" cx="14.5" cy="7.3" r="2" />
      </>
    ),
  },
]

export default function Home() {
  const navigate = useNavigate()
  const navigationType = useNavigationType()
  // Arriving from the chord library with ?q=C: start with just that search showing
  // (read once per visit, before the search state below is set up)
  const incoming = useRef(undefined)
  if (incoming.current === undefined) {
    incoming.current = new URLSearchParams(window.location.search).get('q')
    if (incoming.current !== null) Object.assign(remembered, { query: incoming.current, level: null, learnedOnly: false })
  }
  const [query, setQueryState] = useState(remembered.query)
  const [level, setLevelState] = useState(remembered.level)
  const setQuery = (q) => setQueryState((remembered.query = q))
  const setLevel = (l) => setLevelState((remembered.level = l))
  const [learnedOnly, setLearnedOnlyState] = useState(remembered.learnedOnly)
  const setLearnedOnly = (v) => setLearnedOnlyState((remembered.learnedOnly = v))
  const learned = useStore((st) => st.learned)
  const days = useStore((st) => st.days)
  const lefty = useStore((st) => st.lefty)
  const easy = useStore((st) => st.easyChords)
  const goalMinutes = useStore((st) => st.goalMinutes)
  const earned = useStore((st) => st.badges)
  const streak = streakOf(days)
  const minutesToday = Math.floor(secondsToday(days) / 60)
  const goalShare = Math.min(1, secondsToday(days) / (goalMinutes * 60))

  // Coming back from a song (our back arrow or the browser's): restore the scroll
  // position and let a waiting page transition finish
  useLayoutEffect(() => {
    if (navigationType === 'POP') listReady()
    // The search lives in the box now, so tidy ?q= out of the address
    if (incoming.current !== null) navigate('/', { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const { results, chordQuery } = useMemo(
    () => search(index, { query, level, learnedOnly, learned }),
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
          <button
            className={`goal ${goalShare >= 1 ? 'is-done' : ''}`}
            onClick={cycleGoal}
            aria-label={`Today: ${minutesToday} of ${goalMinutes} minutes. Tap to change the daily goal.`}
            title="Tap to change your daily goal"
          >
            <svg viewBox="0 0 36 36" aria-hidden="true" focusable="false">
              <circle className="goal__track" cx="18" cy="18" r="15" />
              <circle
                className="goal__fill"
                cx="18" cy="18" r="15"
                strokeDasharray={`${goalShare * 94.25} 94.25`}
                transform="rotate(-90 18 18)"
              />
            </svg>
            <span>{goalShare >= 1 ? 'Goal done today!' : `${minutesToday} / ${goalMinutes} min today`}</span>
          </button>
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

      <section className="badges" aria-label="Badges">
        <h2 className="sr-only">Badges</h2>
        <ul>
          {BADGES.map((b) => {
            const got = earned.includes(b.id)
            return (
              <li key={b.id} className={`badge-medal ${got ? 'is-earned' : ''}`} title={`${b.name}: ${b.how}`}>
                <span className="badge-medal__icon" aria-hidden="true">{b.icon}</span>
                <span className="badge-medal__name">{got ? b.name : b.how}</span>
                <span className="sr-only">{got ? ' (earned)' : ' (not yet)'}</span>
              </li>
            )
          })}
        </ul>
      </section>

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
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{tool.icon}</svg>
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
          {chordQuery.size === 1
            ? `Songs with ${capitalise([...chordQuery][0])}`
            : `Songs you can play with ${[...chordQuery].map(capitalise).join(', ')}`}
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
                  {chords.map((c) => (
                    <span key={c} className={`mini-chord ${chordQuery?.has(c.toLowerCase()) ? 'is-match' : ''}`}>{c}</span>
                  ))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <footer className="home__foot">
        <a
          className="btn btn--request"
          href={`mailto:drewnotweird@gmail.com?subject=${encodeURIComponent('Strum: song request')}&body=${encodeURIComponent('Song:\nBand:\n')}`}
        >
          Request a song
        </a>
        <div className="toggles">
          <button
            className={`btn btn--toggle ${easy ? 'is-on' : ''}`}
            onClick={() => setEasyChords(!easy)}
            aria-pressed={easy}
            title="Swap hard chords for easier ones: F becomes Fmaj7, Bm becomes Bm7"
          >
            Easy chords
          </button>
          <button className={`btn btn--toggle ${lefty ? 'is-on' : ''}`} onClick={() => setLefty(!lefty)} aria-pressed={lefty}>
            Left-handed chord diagrams
          </button>
        </div>
      </footer>
    </main>
  )
}

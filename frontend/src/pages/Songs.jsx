import { useLayoutEffect, useMemo, useState } from 'react'
import { useNavigationType, useSearchParams } from 'react-router-dom'
import { songs } from '../lib/song.js'
import { makeCatalogue, search } from '../lib/search.js'
import { chordLabel } from '../data/chords.js'
import { TAGS } from '../data/collections.js'
import { pageReady } from '../lib/transition.js'
import { setKnownChords, useStore } from '../lib/store.js'
import SongCard, { LEVELS } from '../components/SongCard.jsx'
import KnownChordsPanel from '../components/KnownChordsPanel.jsx'

const index = makeCatalogue(songs)
const capitalise = (c) => chordLabel(c.charAt(0).toUpperCase() + c.slice(1))
// Every chord the songs use, in the order the library lists them, for the picker
const ALL_CHORDS = [...new Set(index.catalogue.flatMap((e) => e.chords))].sort((a, b) => a.localeCompare(b))

// The whole library: search plus filters. Everything lives in the address (?q=, ?level=,
// ?tag=, ?fav=1, ?learned=1, ?known=1) so the home page can link straight into any view.
export default function Songs() {
  const navigationType = useNavigationType()
  const [params, setParams] = useSearchParams()
  const learned = useStore((st) => st.learned)
  const favourites = useStore((st) => st.favourites)
  const knownChords = useStore((st) => st.knownChords)
  const [pickerOpen, setPickerOpen] = useState(false)

  const query = params.get('q') || ''
  const level = Number(params.get('level')) || null
  const tag = TAGS[params.get('tag')] ? params.get('tag') : null
  const favouritesOnly = params.get('fav') === '1'
  const learnedOnly = params.get('learned') === '1'
  const knownOnly = params.get('known') === '1' && knownChords.length > 0

  const update = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    setParams(next, { replace: true })
  }

  useLayoutEffect(() => {
    if (navigationType === 'POP') pageReady()
    // Arriving via "Chords I know" with nothing ticked yet: open the picker
    if (params.get('known') === '1' && knownChords.length === 0) setPickerOpen(true)
    document.title = 'Songs · Strum'
    return () => { document.title = 'Strum' }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const known = useMemo(() => new Set(knownChords.map((c) => c.toLowerCase())), [knownChords])
  const { results, chordQuery } = useMemo(
    () => search(index, { query, level, learnedOnly, learned, favouritesOnly, favourites, tag, knownChords: knownOnly ? known : null }),
    [query, level, learnedOnly, learned, favouritesOnly, favourites, tag, knownOnly, known]
  )
  const filtered = Boolean(query || level || tag || favouritesOnly || learnedOnly || knownOnly)
  const highlight = chordQuery || (knownOnly ? known : null)

  const chip = (label, on, onClick, extra = '') => (
    <button type="button" className={`chip filter-chip ${on ? 'is-current' : ''} ${extra}`} aria-pressed={on} onClick={onClick}>
      {label}
    </button>
  )

  return (
    <main className="home songs-page">
      <header className="page-head">
        <h1>Songs</h1>
        <p>{filtered ? `${results.length} of ${songs.length}` : `${songs.length} songs`}</p>
      </header>

      <label className="search">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <line x1="15.5" y1="15.5" x2="21" y2="21" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => update({ q: e.target.value })}
          placeholder="Song, band, or chords like G C D"
          aria-label="Search songs"
          autoComplete="off"
          spellCheck="false"
        />
        {query && <button className="search__clear" onClick={() => update({ q: '' })} aria-label="Clear search">×</button>}
      </label>

      <div className="filter-strip" role="group" aria-label="Filters">
        {chip('♥ Favourites', favouritesOnly, () => update({ fav: favouritesOnly ? '' : '1' }))}
        {chip(knownOnly ? `Chords I know (${knownChords.length})` : 'Chords I know', knownOnly, () => {
          if (knownOnly) update({ known: '' })
          else if (knownChords.length) update({ known: '1' })
          else setPickerOpen(true)
        })}
        {Object.entries(LEVELS).map(([n, name]) =>
          chip(name, level === Number(n), () => update({ level: level === Number(n) ? '' : n }), `filter-chip--level-${n}`))}
        {chip('✓ Learned', learnedOnly, () => update({ learned: learnedOnly ? '' : '1' }))}
        {Object.entries(TAGS).map(([id, name]) => chip(name, tag === id, () => update({ tag: tag === id ? '' : id })))}
      </div>

      {(knownOnly || filtered) && (
        <div className="filter__bar">
          {knownOnly && (
            <button className="link-button" onClick={() => setPickerOpen(true)}>
              Playing with {knownChords.join(', ')} · change
            </button>
          )}
          {filtered && (
            <button className="link-button" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {chordQuery && (
        <p className="filter__hint">
          {chordQuery.size === 1
            ? `Songs with ${capitalise([...chordQuery][0])}`
            : `Songs you can play with ${[...chordQuery].map(capitalise).join(', ')}`}
        </p>
      )}

      <p className="sr-only" aria-live="polite">{filtered ? `${results.length} ${results.length === 1 ? 'song' : 'songs'} found` : ''}</p>

      {results.length === 0 ? (
        <p className="empty">
          {favouritesOnly && favourites.length === 0
            ? 'No favourites yet. Tap the heart on any song to keep it here.'
            : learnedOnly && learned.length === 0
              ? 'No songs learned yet. When you can play one, tap "I can play this!" on its page.'
              : 'No songs match. Try fewer letters, or another filter.'}
        </p>
      ) : (
        <ul className="songs">
          {results.map(({ song, chords }) => (
            <li key={song.id}>
              <SongCard song={song} chords={chords} learned={learned.includes(song.id)} highlight={highlight} />
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
      </footer>

      <KnownChordsPanel
        open={pickerOpen}
        chords={ALL_CHORDS}
        known={knownChords}
        onClose={() => setPickerOpen(false)}
        onSave={(list) => {
          setKnownChords(list)
          setPickerOpen(false)
          update({ known: list.length ? '1' : '' })
        }}
      />
    </main>
  )
}

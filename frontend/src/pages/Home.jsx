import { Link } from 'react-router-dom'
import { songs } from '../lib/song.js'
import { chordLabel } from '../data/chords.js'

const levels = { 1: 'Easy', 2: 'Medium', 3: 'Tricky' }

const songChords = (song) => {
  const names = new Set()
  Object.values(song.sections).forEach((s) => s.steps.forEach((raw) => names.add(chordLabel(raw.split('|')[0]))))
  return [...names]
}

export default function Home() {
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
      <ul className="songs">
        {songs.map((song) => (
          <li key={song.id}>
            <Link to={`/song/${song.id}`} className="song-card">
              <span className="song-card__title">{song.title}</span>
              <span className="song-card__artist">
                {song.artist}{song.kind === 'drill' ? ' · warm-up drill' : ''}
              </span>
              <span className="song-card__meta">
                <span className={`level level--${song.level}`}>{levels[song.level]}</span>
                {song.capo > 0 && <span className="badge">Capo {song.capo}</span>}
              </span>
              <span className="song-card__chords">
                {songChords(song).map((c) => <span key={c} className="mini-chord">{c}</span>)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}

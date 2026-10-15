import { Link, useNavigate } from 'react-router-dom'
import SongCover from './SongCover.jsx'
import FavouriteButton from './FavouriteButton.jsx'
import { artistTransitionName, goLink, titleTransitionName } from '../lib/transition.js'

export const LEVELS = { 1: 'Easy', 2: 'Medium', 3: 'Tricky' }

// A song in a list: details on the left, its pick and difficulty on the right, and a heart.
// `highlight` is a set of lower-case chord names to pick out (from a chord search).
export default function SongCard({ song, chords, learned = false, highlight = null }) {
  const navigate = useNavigate()
  return (
    <div className="song-card-wrap">
      <Link {...goLink(navigate, `/song/${song.id}`)} className="song-card">
        <span className="song-card__side">
          <span className="song-card__pick">
            <SongCover song={song} size={58} />
            {learned && <span className="tick" aria-label="Learned">✓</span>}
          </span>
          <span className={`level level--${song.level}`}>{LEVELS[song.level]}</span>
        </span>
        <span className="song-card__body">
          <span className="song-card__title" style={titleTransitionName(song.id)}>{song.title}</span>
          <span className="song-card__artist">
            <span>
              <span style={artistTransitionName(song.id)}>{song.artist}</span>
              {song.kind === 'drill' ? ' · warm-up drill' : ''}
            </span>
            {song.capo > 0 && <span className="badge">Capo {song.capo}</span>}
          </span>
          <span className="song-card__chords">
            {chords.map((c) => (
              <span key={c} className={`mini-chord ${highlight?.has(c.toLowerCase()) ? 'is-match' : ''}`}>{c}</span>
            ))}
          </span>
        </span>
      </Link>
      <FavouriteButton song={song} className="song-card__fav" />
    </div>
  )
}

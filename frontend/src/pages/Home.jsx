import { useLayoutEffect } from 'react'
import { Link, useNavigate, useNavigationType } from 'react-router-dom'
import { getSong, songs } from '../lib/song.js'
import { songChords } from '../lib/search.js'
import { goLink, pageReady } from '../lib/transition.js'
import { secondsToday, streakOf, useStore } from '../lib/store.js'
import { songOfTheDay } from '../lib/daily.js'
import GoalRing from '../components/GoalRing.jsx'
import SongCover from '../components/SongCover.jsx'
import FavouriteButton from '../components/FavouriteButton.jsx'
import { LEVELS } from '../components/SongCard.jsx'

// Ways into the song library. Each opens the Songs page with a filter already on.
const FINDERS = [
  { to: '/songs?level=1', name: 'Easy songs', emoji: '🌱' },
  { to: '/songs?known=1', name: 'Chords I know', emoji: '🖐️' },
  { to: '/songs?tag=80s', name: '80s', emoji: '📼' },
  { to: '/songs?tag=rock', name: 'Rock and metal', emoji: '🤘' },
  { to: '/songs?tag=classic', name: 'Classics', emoji: '📻' },
  { to: '/songs?tag=90s', name: '90s and now', emoji: '💿' },
  { to: '/songs?tag=singalong', name: 'Sing-alongs', emoji: '🎤' },
  { to: '/songs?tag=christmas', name: 'Christmas', emoji: '🎄' },
]

// "Pick up from the chorus" for ordinary section names, and as written for named ones
// like a drill's "D, B, G"
const PLAIN_SECTIONS = /^(intro|verse|pre-chorus|chorus|bridge|outro|ending|riff|song|changes)$/i
const pickUpFrom = (section) => (PLAIN_SECTIONS.test(section) ? `the ${section.toLowerCase()}` : `“${section}”`)

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

// Home is about him: what he was playing, today's song, his favourites, then ways into
// the library. The full song list lives on the Songs page, so this never grows.
export default function Home() {
  const navigate = useNavigate()
  const navigationType = useNavigationType()
  const learned = useStore((st) => st.learned)
  const favourites = useStore((st) => st.favourites)
  const lastPlayed = useStore((st) => st.lastPlayed)
  const days = useStore((st) => st.days)
  const goalMinutes = useStore((st) => st.goalMinutes)

  useLayoutEffect(() => {
    if (navigationType === 'POP') pageReady()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const streak = streakOf(days)
  const minutesToday = Math.floor(secondsToday(days) / 60)
  const goalShare = Math.min(1, secondsToday(days) / (goalMinutes * 60))
  const resume = lastPlayed && getSong(lastPlayed.id)
  const featured = songOfTheDay(songs, learned)
  const favouriteSongs = songs.filter((s) => favourites.includes(s.id))

  return (
    <main className="home home--hub">
      <header className="hub-head">
        <div>
          <div className="home__title">
            <h1>Strum</h1>
            <svg className="burst" viewBox="0 0 64 64" aria-hidden="true">
              <line x1="22" y1="8" x2="28" y2="20" />
              <line x1="6" y1="22" x2="20" y2="32" />
              <line x1="4" y1="46" x2="20" y2="48" />
            </svg>
          </div>
          <p className="hub-head__hello">{greeting()}. Ready to play?</p>
        </div>
        <Link {...goLink(navigate, '/progress', 'tab')} className="progress-pill" aria-label={`Today ${minutesToday} of ${goalMinutes} minutes, ${streak}-day streak. Open Progress.`}>
          <GoalRing share={goalShare} size={34} />
          <span>
            <strong>{minutesToday}/{goalMinutes} min</strong>
            <span>🔥 {streak} {streak === 1 ? 'day' : 'days'}</span>
          </span>
        </Link>
      </header>

      {resume && (
        <Link {...goLink(navigate, `/song/${resume.id}?from=${lastPlayed.step}`)} className="resume">
          <SongCover song={resume} size={48} fly={false} />
          <span className="resume__text">
            <span className="resume__label">Keep going</span>
            <strong>{resume.title}</strong>
            <span>Pick up from {pickUpFrom(lastPlayed.section)}</span>
          </span>
          <span className="resume__play" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </span>
        </Link>
      )}

      {featured && (
        <section className="featured" aria-labelledby="featured-title">
          {/* The pick is artwork: big, tilted, half off the card's edge */}
          <span className="featured__art" aria-hidden="true">
            <SongCover song={featured} size={170} fly={false} />
          </span>
          <span className="featured__label">Song of the day</span>
          <Link {...goLink(navigate, `/song/${featured.id}`)} className="featured__title" id="featured-title">
            {featured.title}
          </Link>
          <span className="featured__artist">{featured.artist}</span>
          <span className="featured__meta">
            <span className={`level level--${featured.level}`}>{LEVELS[featured.level]}</span>
            {songChords(featured).slice(0, 4).map((c) => <span key={c} className="mini-chord">{c}</span>)}
          </span>
          <span className="featured__actions">
            <Link {...goLink(navigate, `/song/${featured.id}`)} className="featured__cta" aria-label={`Play ${featured.title}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
              Play it
            </Link>
            <FavouriteButton song={featured} className="featured__fav" />
          </span>
        </section>
      )}

      <section className="hub-section" aria-labelledby="fav-title">
        <div className="hub-section__head">
          <h2 id="fav-title">Favourites</h2>
          {favouriteSongs.length > 0 && <Link {...goLink(navigate, '/songs?fav=1', 'tab')} className="see-all">See all</Link>}
        </div>
        {favouriteSongs.length ? (
          <ul className="fav-row">
            {favouriteSongs.map((song) => (
              <li key={song.id}>
                <Link {...goLink(navigate, `/song/${song.id}`)} className="fav-tile">
                  <SongCover song={song} size={64} fly={false} />
                  <span className="fav-tile__name" title={song.title}>{song.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hub-empty">Tap the ♥ on a song you like and it'll wait for you here.</p>
        )}
      </section>

      <section className="hub-section" aria-labelledby="find-title">
        <div className="hub-section__head">
          <h2 id="find-title">Find a song</h2>
          <Link {...goLink(navigate, '/songs', 'tab')} className="see-all">All {songs.length} songs</Link>
        </div>
        <ul className="finders">
          {FINDERS.map((f) => (
            <li key={f.to}>
              <Link {...goLink(navigate, f.to, 'tab')} className="finder">
                <span className="finder__emoji" aria-hidden="true">{f.emoji}</span>
                <span>{f.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

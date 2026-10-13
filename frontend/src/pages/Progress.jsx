import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import GoalRing from '../components/GoalRing.jsx'
import { BADGES } from '../lib/badges.js'
import { songs } from '../lib/song.js'
import { go } from '../lib/transition.js'
import { bestStreak, lastDays, practisedToday, secondsToday, setGoalMinutes, streakOf, totalSeconds, useStore } from '../lib/store.js'

const GOALS = [5, 10, 15, 20]
const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short' })

const hoursAndMinutes = (seconds) => {
  const m = Math.floor(seconds / 60)
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`
}

// Everything Strum knows about his practice, in one place
export default function Progress() {
  const navigate = useNavigate()
  const state = useStore((st) => st)
  const { days, goalMinutes, learned, playedChords, badges } = state

  useEffect(() => {
    document.title = 'Progress · Strum'
    return () => { document.title = 'Strum' }
  }, [])

  const today = secondsToday(days)
  const share = today / (goalMinutes * 60)
  const streak = streakOf(days)
  const week = lastDays(days, 7)
  const weekMax = Math.max(goalMinutes, ...week.map((d) => d.minutes))
  const learnedSongs = songs.filter((s) => learned.includes(s.id))

  return (
    <main className="tool progress-page">
      <header className="player__head">
        <Link to="/" className="back" aria-label="All songs" onClick={(e) => { e.preventDefault(); go(navigate, '/', 'back') }}>←</Link>
        <div className="player__title">
          <h1>Progress</h1>
          <p>Your practice, songs and badges</p>
        </div>
      </header>

      <section className="stat-card stat-card--today">
        <GoalRing share={share} size={96} />
        <div>
          <h2>{share >= 1 ? 'Goal done today!' : 'Today'}</h2>
          <p className="stat-big">{Math.floor(today / 60)} <span>of {goalMinutes} min</span></p>
          <div className="segmented segmented--small" role="group" aria-label="Daily goal">
            {GOALS.map((m) => (
              <GoalButton key={m} minutes={m} current={goalMinutes} onPick={setGoalMinutes} />
            ))}
          </div>
        </div>
      </section>

      <div className="stat-grid">
        <section className={`stat-card ${streak > 0 ? 'is-hot' : ''}`}>
          <h2>Streak</h2>
          <p className="stat-big">{streak} <span>{streak === 1 ? 'day' : 'days'}</span></p>
          <p className="stat-note">
            {streak > 0 && !practisedToday(days) ? 'Play today to keep it going' : `Best ever: ${bestStreak(days)} days`}
          </p>
        </section>
        <section className="stat-card">
          <h2>Total practice</h2>
          <p className="stat-big">{hoursAndMinutes(totalSeconds(days))}</p>
          <p className="stat-note">across {Object.keys(days).length} {Object.keys(days).length === 1 ? 'day' : 'days'}</p>
        </section>
      </div>

      <section className="stat-card">
        <h2>Last 7 days</h2>
        <ol className="week" aria-label="Minutes practised each day">
          {week.map((d, i) => (
            <li key={i} className={d.minutes >= goalMinutes ? 'is-goal' : ''}>
              <span className="week__bar" style={{ height: `${Math.max(4, (d.minutes / weekMax) * 100)}%` }} />
              <span className="week__minutes">{d.minutes}</span>
              <span className="week__day">{i === 6 ? 'Today' : DAY.format(d.date)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="stat-card">
        <h2>Songs I can play <span className="stat-count">{learnedSongs.length} of {songs.length}</span></h2>
        {learnedSongs.length ? (
          <ul className="learned-list">
            {learnedSongs.map((s) => (
              <li key={s.id}>
                <Link to={`/song/${s.id}`} onClick={(e) => { e.preventDefault(); go(navigate, `/song/${s.id}`, 'forward') }}>
                  ✓ {s.title} <span>{s.artist}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="stat-note">None yet. When you can play a song, tap "I can play this!" on its page.</p>
        )}
      </section>

      <section className="stat-card">
        <h2>Chords played <span className="stat-count">{playedChords.length}</span></h2>
        {playedChords.length ? (
          <p className="chord-chips">{playedChords.map((c) => <span key={c} className="mini-chord">{c}</span>)}</p>
        ) : (
          <p className="stat-note">Play along with a song and every chord you strum shows up here.</p>
        )}
      </section>

      <section className="stat-card">
        <h2>Badges <span className="stat-count">{badges.length} of {BADGES.length}</span></h2>
        <ul className="badge-grid">
          {BADGES.map((b) => {
            const got = badges.includes(b.id)
            return (
              <li key={b.id} className={`badge-medal ${got ? 'is-earned' : ''}`}>
                <span className="badge-medal__icon" aria-hidden="true">{b.icon}</span>
                <strong>{b.name}</strong>
                <span className="badge-medal__name">{b.how}</span>
                <span className="sr-only">{got ? '(earned)' : '(not yet)'}</span>
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}

function GoalButton({ minutes, current, onPick }) {
  return (
    <button className={current === minutes ? 'is-on' : ''} aria-pressed={current === minutes} onClick={() => onPick(minutes)}>
      {minutes} min
    </button>
  )
}

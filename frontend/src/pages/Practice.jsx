import { useEffect, useLayoutEffect } from 'react'
import { Link, useNavigate, useNavigationType } from 'react-router-dom'
import { goLink, pageReady } from '../lib/transition.js'
import { setEasyChords, setLefty, useStore } from '../lib/store.js'
import { Switch } from '../components/SettingsPanel.jsx'

// Icons drawn on a 24×24 grid, matching the pages they open
const TOOLS = [
  {
    to: '/tuner',
    name: 'Tuner',
    blurb: 'Get every string in tune before you start',
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
    blurb: 'Switch between two chords against the click until it\'s smooth',
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
    blurb: 'Every shape in the app: tap to hear it and find songs that use it',
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

// The practice tools, and the preferences that apply everywhere
export default function Practice() {
  const navigate = useNavigate()
  const navigationType = useNavigationType()
  const easy = useStore((st) => st.easyChords)
  const lefty = useStore((st) => st.lefty)

  useLayoutEffect(() => {
    if (navigationType === 'POP') pageReady()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    document.title = 'Practice · Strum'
    return () => { document.title = 'Strum' }
  }, [])

  return (
    <main className="home practice-page">
      <header className="page-head">
        <h1>Practice</h1>
        <p>Tools for getting better between songs</p>
      </header>

      <ul className="practice-tools">
        {TOOLS.map((tool) => (
          <li key={tool.to}>
            <Link {...goLink(navigate, tool.to)} className="practice-tool">
              <span className="practice-tool__icon">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{tool.icon}</svg>
              </span>
              <span className="practice-tool__text">
                <strong>{tool.name}</strong>
                <span>{tool.blurb}</span>
              </span>
              <span className="practice-tool__go" aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="stat-card prefs">
        <h2>Preferences</h2>
        <Switch label="Easy chords" note="F becomes Fmaj7 and Bm becomes Bm7: no barre chords, in every song" checked={easy} onChange={setEasyChords} />
        <Switch label="Left-handed" note="Mirror every chord diagram" checked={lefty} onChange={setLefty} />
      </section>
    </main>
  )
}

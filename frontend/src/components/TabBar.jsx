import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { goLink } from '../lib/transition.js'

const TABS = [
  { to: '/', name: 'Home', match: (p) => p === '/', icon: <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" /> },
  { to: '/songs', name: 'Songs', match: (p) => p === '/songs', icon: <><path d="M9 18V6l11-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></> },
  {
    to: '/practice',
    name: 'Practice',
    match: (p) => ['/practice', '/tuner', '/changes', '/chords'].includes(p),
    icon: <path d="M12 21C9 18 4.5 12.5 4.5 8.5 4.5 5.5 7.5 3 12 3s7.5 2.5 7.5 5.5c0 4-4.5 9.5-7.5 12.5z" />,
  },
  { to: '/progress', name: 'Progress', match: (p) => p === '/progress', icon: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" /></> },
]

// The app's four places. Hidden on a song page, which keeps the whole screen for the chords.
export default function TabBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const hidden = pathname.startsWith('/song/')

  useEffect(() => {
    document.body.classList.toggle('has-tabbar', !hidden)
  }, [hidden])

  if (hidden) return null
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((tab) => {
        const on = tab.match(pathname)
        return (
          <Link key={tab.to} {...goLink(navigate, tab.to, 'tab')} className={`tabbar__tab ${on ? 'is-on' : ''}`} aria-current={on ? 'page' : undefined}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{tab.icon}</svg>
            <span>{tab.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}

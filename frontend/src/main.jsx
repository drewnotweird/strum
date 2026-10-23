import React, { Suspense, lazy, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home.jsx'
import TabBar from './components/TabBar.jsx'
import Toaster from './components/Toaster.jsx'
import './index.css'

// Every page but Home loads on demand, so the first visit downloads only what it shows.
// Once loaded, a page renders straight away (no Suspense pause), which keeps page
// transitions from snapshotting a blank screen.
function page(load) {
  let Loaded = null
  const preload = () => load().then((m) => (Loaded = m.default))
  const Lazy = lazy(() => preload().then(() => ({ default: Loaded })))
  const Page = (props) => (Loaded ? <Loaded {...props} /> : <Lazy {...props} />)
  Page.preload = preload
  return Page
}

const Songs = page(() => import('./pages/Songs.jsx'))
const Practice = page(() => import('./pages/Practice.jsx'))
const Player = page(() => import('./pages/Player.jsx'))
const Sheet = page(() => import('./pages/Sheet.jsx'))
const Tuner = page(() => import('./pages/Tuner.jsx'))
const Trainer = page(() => import('./pages/Trainer.jsx'))
const Chords = page(() => import('./pages/Chords.jsx'))
const Strums = page(() => import('./pages/Strums.jsx'))
const Progress = page(() => import('./pages/Progress.jsx'))

// Fetch the rest in the background once the first page is up, so every tap is instant
const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200))
window.addEventListener('load', () => idle(() => {
  for (const P of [Songs, Player, Practice, Progress, Trainer, Strums, Tuner, Chords, Sheet]) P.preload().catch(() => {})
}))

// Each main page has its own colour (Home blue, Songs violet, Practice teal, Progress
// orange); the practice tools share Practice's. Song pages keep the blue.
const pageTheme = (pathname) => {
  if (pathname === '/songs') return 'songs'
  if (['/practice', '/tuner', '/changes', '/strums', '/chords'].includes(pathname)) return 'practice'
  if (pathname === '/progress') return 'progress'
  return 'home'
}

// Corner blobs, in the page's colour. Song pages slide them away for the chords.
function Blobs() {
  const { pathname } = useLocation()
  const onSong = pathname.startsWith('/song/')
  useEffect(() => {
    document.documentElement.dataset.theme = pageTheme(pathname)
  }, [pathname])
  return (
    <div className={`blobs ${onSong ? 'is-away' : ''}`} aria-hidden="true">
      <svg className="blob blob--tr" viewBox="0 0 200 160">
        <path d="M0 0h200v160c-22 2-40-14-48-38-10-30-22-44-56-50C58 66 22 50 6 22 2 14 0 7 0 0z" />
      </svg>
      <svg className="blob blob--bl" viewBox="0 0 220 140">
        <path d="M0 140V0c20 0 42 10 60 30 24 26 40 50 86 58 34 6 58 24 74 52z" />
      </svg>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <Blobs />
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/songs" element={<Songs />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/song/:id" element={<Player />} />
        <Route path="/song/:id/sheet" element={<Sheet />} />
        <Route path="/tuner" element={<Tuner />} />
        <Route path="/changes" element={<Trainer />} />
        <Route path="/strums" element={<Strums />} />
        <Route path="/chords" element={<Chords />} />
        <Route path="/progress" element={<Progress />} />
      </Routes>
    </Suspense>
    <TabBar />
    <Toaster />
  </BrowserRouter>
)

// Offline support and home-screen install (production only: a service worker caching the
// dev server's files would get in the way while developing)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {})
  })
}

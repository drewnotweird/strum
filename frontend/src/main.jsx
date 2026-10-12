import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Player from './pages/Player.jsx'
import Tuner from './pages/Tuner.jsx'
import Trainer from './pages/Trainer.jsx'
import Chords from './pages/Chords.jsx'
import './index.css'

// Green corner blobs: on the song list only. Song pages slide them away off-screen.
function Blobs() {
  const { pathname } = useLocation()
  return (
    <div className={`blobs ${pathname === '/' ? '' : 'is-away'}`} aria-hidden="true">
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
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/song/:id" element={<Player />} />
      <Route path="/tuner" element={<Tuner />} />
      <Route path="/changes" element={<Trainer />} />
      <Route path="/chords" element={<Chords />} />
    </Routes>
  </BrowserRouter>
)

// Offline support and home-screen install (production only: a service worker caching the
// dev server's files would get in the way while developing)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {})
  })
}

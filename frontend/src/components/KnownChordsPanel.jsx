import { useEffect, useRef, useState } from 'react'
import ChordDiagram from './ChordDiagram.jsx'

// "Chords I know": tick the chords he can play, and the Songs page shows only songs that
// use nothing else. Same sheet styling as the song page's Settings panel.
export default function KnownChordsPanel({ open, chords, known, onSave, onClose }) {
  const [picked, setPicked] = useState(new Set(known))
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setPicked(new Set(known))
    const previous = document.activeElement
    panelRef.current?.querySelector('button')?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('has-panel')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('has-panel')
      previous?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null
  const toggle = (c) => setPicked((s) => {
    const next = new Set(s)
    next.has(c) ? next.delete(c) : next.add(c)
    return next
  })

  return (
    <div className="panel-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section ref={panelRef} className="panel" role="dialog" aria-modal="true" aria-labelledby="known-title">
        <header className="panel__head">
          <h2 id="known-title">Chords I know</h2>
          <button type="button" className="btn btn--done" onClick={() => onSave([...picked])}>
            Show songs
          </button>
        </header>
        <div className="panel__body">
          <p className="setting__note">Tick every chord you can play. You'll see the songs that only need those.</p>
          <ul className="known-grid">
            {chords.map((c) => (
              <li key={c}>
                <button type="button" className={`known-chord ${picked.has(c) ? 'is-on' : ''}`} aria-pressed={picked.has(c)} onClick={() => toggle(c)}>
                  <span>{c}</span>
                  <ChordDiagram name={c} className="diagram--known" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}

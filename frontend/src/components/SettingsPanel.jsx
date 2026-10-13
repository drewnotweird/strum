import { useEffect, useRef } from 'react'

// An on/off row: label, one line of explanation, and a switch
function Switch({ label, note, checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="setting"
      onClick={() => onChange(!checked)}
      disabled={disabled}
    >
      <span className="setting__text">
        <span className="setting__label">{label}</span>
        {note && <span className="setting__note">{note}</span>}
      </span>
      <span className={`switch ${checked ? 'is-on' : ''}`} aria-hidden="true"><span /></span>
    </button>
  )
}

function Choice({ label, options, value, onChange, disabled = false }) {
  return (
    <div className="setting setting--choice">
      <span className="setting__label" id={`choice-${label}`}>{label}</span>
      <div className="segmented" role="radiogroup" aria-labelledby={`choice-${label}`}>
        {options.map(([v, text]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? 'is-on' : ''} onClick={() => onChange(v)} disabled={disabled}>
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

// The song page's settings, grouped by what they're for. A bottom sheet on phones and a
// side panel on wider screens. Escape, the backdrop or Done closes it.
export default function SettingsPanel({ open, onClose, s }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    panelRef.current?.querySelector('button, input')?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      // Keep Tab inside the panel while it's open
      if (e.key === 'Tab') {
        const items = [...panelRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled)')]
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('has-panel')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('has-panel')
      previous?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null
  const pct = Math.round(s.speed * 100)

  return (
    <div className="panel-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section ref={panelRef} className="panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="panel__head">
          <h2 id="settings-title">Settings</h2>
          <button type="button" className="btn btn--done" onClick={onClose}>Done</button>
        </header>

        <div className="panel__body">
          <section className="panel__group">
            <h3>Tempo</h3>
            <div className={`setting setting--speed ${s.listenMode ? 'is-disabled' : ''}`}>
              <span className="setting__text">
                <span className="setting__label">Speed <strong>{pct}%</strong></span>
                <span className="setting__note">{s.listenMode ? 'Listen mode follows you, not the clock' : 'Slow it down while you learn'}</span>
              </span>
              <div className="speed-control">
                <button type="button" className="step" onClick={() => s.setSpeed(Math.max(0.4, Math.round((s.speed - 0.05) * 100) / 100))} disabled={s.listenMode || s.speed <= 0.4} aria-label="Slower">−</button>
                <input
                  type="range" min="0.4" max="1" step="0.05" value={s.speed}
                  onChange={(e) => s.setSpeed(Number(e.target.value))}
                  disabled={s.listenMode}
                  aria-label="Speed"
                  aria-valuetext={`${pct}%`}
                />
                <button type="button" className="step" onClick={() => s.setSpeed(Math.min(1, Math.round((s.speed + 0.05) * 100) / 100))} disabled={s.listenMode || s.speed >= 1} aria-label="Faster">+</button>
              </div>
            </div>
            <Switch
              label="Speed up each loop"
              note={s.loopOn ? '5% faster every time round, up to full speed' : 'Turn on Loop to use this'}
              checked={s.loopOn && s.rampOn}
              onChange={s.setRampOn}
              disabled={!s.loopOn || s.listenMode}
            />
          </section>

          <section className="panel__group">
            <h3>Practice</h3>
            <Switch
              label="Listen to me"
              note="Moves on when it hears you strum, instead of following the clock"
              checked={s.listenMode}
              onChange={s.toggleListenMode}
            />
            {s.listenMode && (
              <Choice
                label="Room"
                value={s.sensitivity}
                onChange={s.setSensitivity}
                options={[['low', 'Noisy'], ['medium', 'Normal'], ['high', 'Quiet playing']]}
              />
            )}
          </section>

          <section className="panel__group">
            <h3>Sound</h3>
            <Switch label="Guitar sound" note="Hear each strum played along with you" checked={s.guitarOn} onChange={s.setGuitarOn} disabled={s.listenMode} />
            <Choice
              label="Beat"
              value={s.beat}
              onChange={s.setBeat}
              disabled={s.listenMode}
              options={[['click', 'Click'], ['drums', 'Drums'], ['off', 'None']]}
            />
          </section>

          <section className="panel__group">
            <h3>Chords</h3>
            <Switch label="Easy chords" note="F becomes Fmaj7 and Bm becomes Bm7: no barre chords" checked={s.easy} onChange={s.setEasyChords} />
            <Switch label="Left-handed" note="Mirror the chord diagrams" checked={s.lefty} onChange={s.setLefty} />
          </section>
        </div>
      </section>
    </div>
  )
}

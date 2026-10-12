import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { go } from '../lib/transition.js'
import { playNote } from '../lib/audio.js'
import { keepAwake } from '../lib/wakeLock.js'

// Standard tuning, low to high
const STRINGS = [
  { name: 'E', octave: 2, midi: 40, label: 'low E' },
  { name: 'A', octave: 2, midi: 45, label: 'A' },
  { name: 'D', octave: 3, midi: 50, label: 'D' },
  { name: 'G', octave: 3, midi: 55, label: 'G' },
  { name: 'B', octave: 3, midi: 59, label: 'B' },
  { name: 'E', octave: 4, midi: 64, label: 'high E' },
]
const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
const IN_TUNE = 5 // cents either way

const midiOf = (freq) => 69 + 12 * Math.log2(freq / 440)
const freqOf = (midi) => 440 * 2 ** ((midi - 69) / 12)

// Autocorrelation pitch detection, only searching the lags a guitar can produce
// (about 70–1000 Hz), which keeps it light enough to run many times a second on a phone.
export function detectPitch(buf, sampleRate) {
  let rms = 0
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i]
  if (Math.sqrt(rms / buf.length) < 0.01) return null // too quiet: nothing being played

  const minLag = Math.floor(sampleRate / 1000)
  const maxLag = Math.min(Math.floor(sampleRate / 70), buf.length >> 1)
  const n = buf.length - maxLag
  const corr = new Float32Array(maxLag + 2)
  for (let lag = minLag - 1; lag <= maxLag + 1; lag++) {
    let sum = 0
    for (let i = 0; i < n; i++) sum += buf[i] * buf[i + lag]
    corr[lag] = sum
  }
  // Skip past the first dip, then find the strongest peak. The waveform also lines up
  // with itself at 2x, 3x… the period, nearly as well, so take the *first* peak that's
  // almost as strong: that's the true period, not an octave below it.
  let lag = minLag
  while (lag < maxLag && corr[lag] > corr[lag + 1]) lag++
  let strongest = lag
  for (let l = lag; l <= maxLag; l++) if (corr[l] > corr[strongest]) strongest = l
  if (corr[strongest] <= 0) return null
  let best = strongest
  for (let l = lag; l < strongest; l++) {
    if (corr[l] >= 0.9 * corr[strongest] && corr[l] >= corr[l - 1] && corr[l] >= corr[l + 1]) {
      best = l
      break
    }
  }
  // Refine between samples with a parabola through the peak
  const [a, b, c] = [corr[best - 1], corr[best], corr[best + 1]]
  const shift = (a - c) / (2 * (a - 2 * b + c)) || 0
  return sampleRate / (best + shift)
}

export default function Tuner() {
  const navigate = useNavigate()
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const [reading, setReading] = useState(null) // { note, cents, string }
  const stopRef = useRef(null)

  useEffect(() => {
    document.title = 'Tuner · Strum'
    return () => {
      document.title = 'Strum'
      stopRef.current?.()
    }
  }, [])

  async function start() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 4096
      source.connect(analyser)
      const buf = new Float32Array(analyser.fftSize)
      const recent = []
      let raf = 0
      let frame = 0

      const loop = () => {
        raf = requestAnimationFrame(loop)
        if (frame++ % 3) return // ~20 readings a second is plenty
        analyser.getFloatTimeDomainData(buf)
        const freq = detectPitch(buf, ctx.sampleRate)
        if (!freq) return
        // Median of the last few readings smooths out the odd wild guess
        recent.push(freq)
        if (recent.length > 5) recent.shift()
        const steady = [...recent].sort((x, y) => x - y)[recent.length >> 1]
        const midi = midiOf(steady)
        const string = STRINGS.reduce((best, s) => (Math.abs(s.midi - midi) < Math.abs(best.midi - midi) ? s : best))
        const nearest = Math.round(midi)
        setReading({
          note: NOTE_NAMES[((nearest % 12) + 12) % 12],
          freq: steady,
          cents: Math.round((midi - string.midi) * 100),
          string,
        })
      }
      loop()
      keepAwake(true)
      setListening(true)
      stopRef.current = () => {
        cancelAnimationFrame(raf)
        stream.getTracks().forEach((t) => t.stop())
        ctx.close()
        keepAwake(false)
      }
    } catch {
      setError('Strum needs the microphone to hear your guitar. Allow it in your browser settings, then try again.')
    }
  }

  function stop() {
    stopRef.current?.()
    stopRef.current = null
    setListening(false)
    setReading(null)
  }

  const cents = reading ? Math.max(-50, Math.min(50, reading.cents)) : 0
  const inTune = reading && Math.abs(reading.cents) <= IN_TUNE
  const advice = !reading
    ? listening ? 'Play one string at a time' : ''
    : inTune ? 'In tune!' : reading.cents < 0 ? 'Too low: tighten the string' : 'Too high: loosen the string'

  return (
    <main className="tool">
      <header className="player__head">
        <Link to="/" className="back" aria-label="All songs" onClick={(e) => { e.preventDefault(); go(navigate, '/', 'back') }}>←</Link>
        <div className="player__title">
          <h1>Tuner</h1>
          <p>Standard tuning: E A D G B E</p>
        </div>
      </header>

      <section className={`tuner ${inTune ? 'is-in-tune' : ''}`} aria-live="polite">
        <div className="tuner__note">
          {reading ? reading.string.name : '–'}
          {reading && <span className="tuner__which">{reading.string.label} string</span>}
        </div>
        <div className="meter" role="img" aria-label={reading ? `${reading.cents} cents ${reading.cents < 0 ? 'flat' : 'sharp'}` : 'No note'}>
          <span className="meter__label meter__label--flat">Too low</span>
          <span className="meter__zone" />
          <span className="meter__needle" style={{ transform: `translateX(${cents * 2}%)` }} />
          <span className="meter__label meter__label--sharp">Too high</span>
        </div>
        <p className="tuner__advice">{advice}</p>
        {reading && <p className="tuner__detail">Hearing {reading.note} · {reading.freq.toFixed(1)} Hz · {reading.cents > 0 ? '+' : ''}{reading.cents} cents</p>}
      </section>

      <div className="tuner__actions">
        {listening ? (
          <button className="key key--space" onClick={stop}><span>Stop listening</span></button>
        ) : (
          <button className="key key--space" onClick={start}><span>Start tuner</span></button>
        )}
      </div>
      {error && <p className="tool__error" role="alert">{error}</p>}

      <section className="tool__section">
        <h2>Tune by ear</h2>
        <p className="hint">Tap a string to hear the note it should be.</p>
        <div className="string-buttons">
          {STRINGS.map((s) => (
            <button
              key={s.midi}
              className={`chip string-button ${reading?.string.midi === s.midi ? 'is-current' : ''}`}
              onClick={() => playNote(s.midi)}
              aria-label={`Play ${s.label} string, ${freqOf(s.midi).toFixed(0)} hertz`}
            >
              {s.name}<sub>{s.octave}</sub>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}

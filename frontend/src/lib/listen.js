// Hears strums. Watches the sound for sudden bursts of new energy across the spectrum
// ("spectral flux"): a pick hitting the strings makes one, while a chord ringing on
// doesn't. Each burst that stands out from the recent background counts as one strum.
// It doesn't judge chords, only that something was strummed or picked. With `pitch` on (melody
// mode), it also measures the note a moment after each onset and passes its frequency on.
import { detectPitch } from './pitch.js'

const PITCH_WINDOW = 4096 // ~85 ms: enough cycles for the lowest note in a melody
const PITCH_DELAY_MS = 110 // let the pick's click die down before measuring

const FFT_SIZE = 1024
const HISTORY = 45 // frames of recent flux used to judge the background
const WARM_UP = 8 // frames to learn the room before listening for strums

// Detector settings, tuned against synthesised strumming and picking (fast, slow, chugging,
// noisy and quiet rooms). Exposed so they can be re-tuned.
export const DEFAULTS = {
  minGapMs: 110, // two strums can't be closer than this (fast 16ths at ~130 bpm)
  compression: 100, // loudness is compressed so soft up-strums count, without amplifying hiss
  lag: 3, // compare with the sound this many frames ago...
  spread: 2, // ...taking the loudest of this many neighbouring bands either side, so ringing
  //           strings that wobble slightly in pitch or level don't look like new sound
  afterShare: 0.6, // after a strum the bar rises to this share of its strength...
  afterHalfLifeMs: 110, // ...and falls back with this half-life
}

// How far above the background a burst must be, by sensitivity
const SENSITIVITY = { low: 3.2, medium: 2.4, high: 1.7 }

export function createStrumListener({ ctx, source, onStrum, sensitivity = 'medium', tuning = {}, pitch = false }) {
  const cfg = { ...DEFAULTS, ...tuning }
  const analyser = ctx.createAnalyser()
  analyser.fftSize = FFT_SIZE
  analyser.smoothingTimeConstant = 0
  source.connect(analyser)
  let pitchAnalyser = null
  const pitchBuf = new Float32Array(PITCH_WINDOW)
  if (pitch) {
    pitchAnalyser = ctx.createAnalyser()
    pitchAnalyser.fftSize = PITCH_WINDOW
    source.connect(pitchAnalyser)
  }
  const heard = () => {
    if (!pitch) return onStrum()
    setTimeout(() => {
      pitchAnalyser.getFloatTimeDomainData(pitchBuf)
      onStrum(detectPitch(pitchBuf, ctx.sampleRate))
    }, PITCH_DELAY_MS)
  }

  const bins = analyser.frequencyBinCount
  // Roughly 80 Hz to 8 kHz: the body of a strum and the bright pick attack
  const lo = Math.max(1, Math.floor((80 / ctx.sampleRate) * FFT_SIZE))
  const hi = Math.min(bins, Math.ceil((8000 / ctx.sampleRate) * FFT_SIZE))
  const n = hi - lo
  const db = new Float32Array(bins)
  const time = new Float32Array(FFT_SIZE)
  const past = [] // recent frames of compressed loudness, newest last
  const history = []
  let frames = 0
  let lastStrum = -Infinity
  let lastStrumFlux = 0
  let lastFlux = 0
  let factor = SENSITIVITY[sensitivity]
  let raf = 0

  function frame() {
    raf = requestAnimationFrame(frame)
    analyser.getFloatFrequencyData(db)
    analyser.getFloatTimeDomainData(time)

    const mag = new Float32Array(n)
    for (let i = 0; i < n; i++) mag[i] = Math.log1p(cfg.compression * Math.pow(10, db[i + lo] / 20))
    past.push(mag)
    if (past.length <= cfg.lag) return
    const ref = past.shift()

    // Only increases count, measured against the loudest nearby band a moment ago
    let flux = 0
    for (let i = 0; i < n; i++) {
      let before = 0
      for (let j = Math.max(0, i - cfg.spread); j <= Math.min(n - 1, i + cfg.spread); j++) before = Math.max(before, ref[j])
      const rise = mag[i] - before
      if (rise > 0) flux += rise
    }
    flux /= n

    let rms = 0
    for (let i = 0; i < time.length; i++) rms += time[i] * time[i]
    rms = Math.sqrt(rms / time.length)

    // Background: a low percentile of recent frames, so strums themselves don't raise it
    const sorted = [...history].sort((a, b) => a - b)
    const background = sorted.length ? sorted[Math.floor(sorted.length * 0.3)] : 0
    history.push(flux)
    if (history.length > HISTORY) history.shift()

    const now = performance.now()
    const sinceStrum = now - lastStrum
    const afterStrum = lastStrumFlux * cfg.afterShare * Math.pow(0.5, sinceStrum / cfg.afterHalfLifeMs)
    const threshold = Math.max(background * factor + 0.004, afterStrum)

    const ready = ++frames > WARM_UP
    const loudEnough = rms > 0.003
    if (ready && loudEnough && flux > threshold && flux > lastFlux && sinceStrum > cfg.minGapMs) {
      lastStrum = now
      lastStrumFlux = flux
      heard()
    } else if (sinceStrum < cfg.minGapMs && flux > lastStrumFlux) {
      // Still the same strum building up: remember its real peak
      lastStrumFlux = flux
    }
    lastFlux = flux
  }
  frame()

  return {
    setSensitivity: (s) => { factor = SENSITIVITY[s] },
    stop: () => {
      cancelAnimationFrame(raf)
      source.disconnect(analyser)
      if (pitchAnalyser) source.disconnect(pitchAnalyser)
    },
  }
}

// Microphone in, listener attached. Resolves to an object with stop() and setSensitivity().
export async function listenToMicrophone({ onStrum, sensitivity, pitch = false }) {
  const stream = await navigator.mediaDevices.getUserMedia({
    // Raw sound: noise suppression and auto-gain smear exactly the bursts we're looking for
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  })
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const source = ctx.createMediaStreamSource(stream)
  const listener = createStrumListener({ ctx, source, onStrum, sensitivity, pitch })
  return {
    setSensitivity: listener.setSensitivity,
    stop: () => {
      listener.stop()
      stream.getTracks().forEach((t) => t.stop())
      ctx.close()
    },
  }
}

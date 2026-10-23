import { chords } from '../data/chords.js'

// Synthesised acoustic guitar: each string is a Karplus-Strong plucked string, rendered
// once per pitch into an AudioBuffer and cached. Strums roll across the strings.

const OPEN_STRINGS = [40, 45, 50, 55, 59, 64] // MIDI notes, low E → high e
const buffers = new Map()

// A short burst of noise: the scratchy part of a chuck
let slapNoise = null
function slapBuffer(ctx) {
  if (slapNoise?.sampleRate === ctx.sampleRate) return slapNoise
  slapNoise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate)
  const d = slapNoise.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3
  return slapNoise
}

function pluckBuffer(ctx, midi) {
  const key = `${ctx.sampleRate}:${midi}`
  if (buffers.has(key)) return buffers.get(key)

  const sr = ctx.sampleRate
  const freq = 440 * 2 ** ((midi - 69) / 12)
  const length = Math.floor(sr * 2)
  const buffer = ctx.createBuffer(1, length, sr)
  const y = buffer.getChannelData(0)
  // The averaging filter adds half a sample of delay, so take it off the period
  const period = sr / freq - 0.5
  const seed = Math.ceil(period) + 2
  // Lower strings ring longer, like the real thing
  const decay = 0.9965 + Math.min(0.0025, (64 - midi) * 0.00012)

  let prev = 0
  for (let n = 0; n < seed; n++) {
    // Softened noise burst: a pick, not a hammer
    const white = Math.random() * 2 - 1
    prev = 0.55 * white + 0.45 * prev
    y[n] = prev
  }
  const at = (pos) => {
    const i = Math.floor(pos)
    const f = pos - i
    return y[i] * (1 - f) + y[i + 1] * f
  }
  for (let n = seed; n < length; n++) {
    const back = n - period
    y[n] = decay * 0.5 * (at(back) + at(back - 1))
  }
  buffers.set(key, buffer)
  return buffer
}

// Every pitch a song can play, for prewarming
export function songNotes(chordNames, capo = 0) {
  return chordNames.flatMap((name) => voiceFor(name, 'D', capo)?.notes.map((n) => n.midi) || [])
}

// How hard a section's feel plays
const FEEL = { soft: 0.55, loud: 1.3 }

// What a strum slot should sound like: which notes, which way, how hard
export function voiceFor(chordName, token, capo = 0, feel = null) {
  const voice = voiceOf(chordName, token, capo)
  if (voice && FEEL[feel]) voice.velocity *= FEEL[feel]
  return voice
}

function voiceOf(chordName, token, capo) {
  const shape = chords[chordName]
  if (!shape || token === '-') return null
  const notes = shape.frets
    .map((fret, s) => (fret < 0 ? null : { s, midi: OPEN_STRINGS[s] + fret + capo }))
    .filter(Boolean)

  if (token === 'D') return { notes, gap: 0.011, velocity: 1, choke: true }
  // A chuck: the strumming hand lands flat on the strings, a short click with little pitch
  if (token === 'X') return { notes: notes.slice(0, 4), gap: 0.004, velocity: 0.35, choke: true, muted: 0.012, slap: true }
  // Palm-muted down: the low strings, damped almost straight away
  if (token === 'M') return { notes: notes.slice(0, 3), gap: 0.008, velocity: 0.9, choke: true, muted: 0.05 }
  // Up-strums catch the top few strings only, high to low
  if (token === 'U') return { notes: notes.slice(-4).reverse(), gap: 0.009, velocity: 0.6, choke: true }

  // Picking: B is the chord's bass string, otherwise a string number (1 = thinnest)
  const stringNo = token === 'B' ? shape.root : Number(token)
  const note = notes.find((n) => n.s === 6 - stringNo)
  // Picked notes ring into each other, so they don't choke what came before
  return note ? { notes: [note], gap: 0, velocity: 0.9, choke: false } : null
}

// `compress: false` gives the raw strings, like a real guitar heard in a room (used to
// test the strum listener without the compressor's volume swells)
export function createGuitar(ctx, destination = ctx.destination, { compress = true } = {}) {
  const compressor = ctx.createDynamicsCompressor()
  compressor.threshold.value = -14
  compressor.ratio.value = 4
  const tone = ctx.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.value = 4200
  const master = ctx.createGain()
  master.gain.value = 1
  if (compress) tone.connect(compressor).connect(master)
  else tone.connect(master)
  master.connect(destination)

  let ringing = []

  // A new strum chokes the ones before it, as your hand does on a real guitar
  function damp(time) {
    ringing.forEach((bus) => bus.gain.setTargetAtTime(0, time, 0.025))
    ringing = []
  }

  function play(time, voice) {
    if (voice.choke) damp(time)
    const bus = ctx.createGain()
    bus.connect(tone)
    // Muted strums die away almost at once
    if (voice.muted) {
      bus.gain.setValueAtTime(1, time)
      bus.gain.setTargetAtTime(0, time + voice.muted, voice.muted / 2)
    }
    ringing.push(bus)
    const sources = []
    // A chuck is mostly a slap: the hand hitting muted strings
    if (voice.slap) {
      const noise = ctx.createBufferSource()
      noise.buffer = slapBuffer(ctx)
      const band = ctx.createBiquadFilter()
      band.type = 'bandpass'
      band.frequency.value = 1900
      band.Q.value = 0.9
      const gain = ctx.createGain()
      gain.gain.value = 0.9 * voice.velocity
      noise.connect(band).connect(gain).connect(tone)
      noise.start(time)
      sources.push(noise)
    }
    return sources.concat(voice.notes.map(({ midi }, k) => {
      const src = ctx.createBufferSource()
      src.buffer = pluckBuffer(ctx, midi)
      const gain = ctx.createGain()
      gain.gain.value = 0.32 * voice.velocity
      src.connect(gain).connect(bus)
      src.start(time + k * voice.gap)
      return src
    }))
  }

  // Render a song's notes ahead of time, one per slice, so a chord change never has to
  // compute strings on the beat. Runs during the count-in.
  function prewarm(midis) {
    const queue = [...new Set(midis)].filter((m) => !buffers.has(`${ctx.sampleRate}:${m}`))
    const next = () => {
      const midi = queue.shift()
      if (midi === undefined) return
      pluckBuffer(ctx, midi)
      setTimeout(next, 0)
    }
    next()
  }

  return { play, damp, prewarm }
}

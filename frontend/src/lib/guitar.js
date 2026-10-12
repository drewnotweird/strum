import { chords } from '../data/chords.js'

// Synthesised acoustic guitar: each string is a Karplus-Strong plucked string, rendered
// once per pitch into an AudioBuffer and cached. Strums roll across the strings.

const OPEN_STRINGS = [40, 45, 50, 55, 59, 64] // MIDI notes, low E → high e
const buffers = new Map()

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

// What a strum slot should sound like: which notes, which way, how hard
export function voiceFor(chordName, token, capo = 0) {
  const shape = chords[chordName]
  if (!shape || token === '-') return null
  const notes = shape.frets
    .map((fret, s) => (fret < 0 ? null : { s, midi: OPEN_STRINGS[s] + fret + capo }))
    .filter(Boolean)

  if (token === 'D') return { notes, gap: 0.011, velocity: 1, choke: true }
  // Up-strums catch the top few strings only, high to low
  if (token === 'U') return { notes: notes.slice(-4).reverse(), gap: 0.009, velocity: 0.6, choke: true }

  // Picking: B is the chord's bass string, otherwise a string number (1 = thinnest)
  const stringNo = token === 'B' ? shape.root : Number(token)
  const note = notes.find((n) => n.s === 6 - stringNo)
  // Picked notes ring into each other, so they don't choke what came before
  return note ? { notes: [note], gap: 0, velocity: 0.9, choke: false } : null
}

export function createGuitar(ctx) {
  const compressor = ctx.createDynamicsCompressor()
  compressor.threshold.value = -14
  compressor.ratio.value = 4
  const tone = ctx.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.value = 4200
  const master = ctx.createGain()
  master.gain.value = 1
  tone.connect(compressor).connect(master).connect(ctx.destination)

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
    ringing.push(bus)
    return voice.notes.map(({ midi }, k) => {
      const src = ctx.createBufferSource()
      src.buffer = pluckBuffer(ctx, midi)
      const gain = ctx.createGain()
      gain.gain.value = 0.32 * voice.velocity
      src.connect(gain).connect(bus)
      src.start(time + k * voice.gap)
      return src
    })
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

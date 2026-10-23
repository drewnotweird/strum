// Audio-clock driven player. Time is counted in strum slots; the Web Audio clock schedules
// the metronome and guitar ahead of time and a rAF loop reports which slot is current.
// Slots below `fromIndex` after a start() are the count-in.
// voiceAt(i) says what the guitar should play on slot i (see guitar.js), or null;
// notes lists the song's pitches so they can be rendered before they're needed.
//
// Timing is a list of segments, each saying "from audio time `from`, slot `index` is at
// `time` and slots last this long". A loop wrap or speed change adds a segment that starts
// in the future, so sound (scheduled ahead) and visuals (drawn now) each use the right one.
import { createGuitar } from './guitar.js'
import { drumHits, playDrums } from './drums.js'

const LOOKAHEAD = 0.12

// backingAt(i): chords to play quietly under a melody on slot i, on their own guitar so they
// never cut the melody notes short
export function createPlayer({ length, slotsPerBeat, slotsPerBar, bpm, voiceAt, backingAt = null, notes = [], onSlot, onEnd, onSpeed, onStopAt }) {
  let backing = null
  let ctx = null
  let guitar = null
  let guitarOn = true
  let beat = 'click' // 'click' | 'drums' | 'off'
  let stopAt = null // play up to here, then stop (hear-a-section)
  let playing = false
  let speed = 1
  let segments = []
  let countInStart = 0
  let firstIndex = 0
  let nextToSchedule = 0
  let lastReported = null
  let timer = null
  let raf = null
  let scheduled = []
  let loop = null // { start, end } in slots
  let rampUp = false // speed trainer: a little faster every time round the loop

  const dur = (s) => 60 / (bpm * s) / slotsPerBeat
  const latest = () => segments[segments.length - 1]
  const timeOf = (i) => {
    const seg = latest()
    return seg.time + (i - seg.index) * dur(seg.speed)
  }
  const positionAt = (now) => {
    let seg = segments[0]
    for (const s of segments) if (s.from <= now) seg = s
    // Before a segment's first slot sounds, hold on that slot rather than showing the one before
    return Math.max(seg.index, seg.index + (now - seg.time) / dur(seg.speed))
  }
  const mod = (n, m) => ((n % m) + m) % m

  function click(time, accent) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = accent ? 1600 : 1000
    gain.gain.setValueAtTime(accent ? 0.35 : 0.2, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06)
    osc.connect(gain).connect(ctx.destination)
    osc.start(time)
    osc.stop(time + 0.07)
    scheduled.push({ osc, time })
  }

  // Reached the end of the looped section: carry on from its start, seamlessly
  function wrap() {
    const at = timeOf(loop.end)
    const nextSpeed = rampUp ? Math.min(1, Math.round((speed + 0.05) * 100) / 100) : speed
    segments.push({ from: at, index: loop.start, time: at, speed: nextSpeed })
    nextToSchedule = loop.start
    firstIndex = Math.min(firstIndex, loop.start)
    if (nextSpeed !== speed) {
      speed = nextSpeed
      setTimeout(() => onSpeed?.(nextSpeed), Math.max(0, (at - ctx.currentTime) * 1000))
    }
  }

  function schedule() {
    const horizon = ctx.currentTime + LOOKAHEAD
    for (;;) {
      if (loop && stopAt === null && nextToSchedule === loop.end && loop.end > loop.start) wrap()
      if (nextToSchedule >= (stopAt ?? length) || timeOf(nextToSchedule) >= horizon) break
      const i = nextToSchedule
      const time = Math.max(timeOf(i), ctx.currentTime)
      const countIn = i < firstIndex
      const beatSlot = countIn ? i - countInStart : i
      const onBeat = mod(beatSlot, slotsPerBeat) === 0
      // The count-in is always clicks (like drumsticks), unless the beat is off altogether
      if (beat === 'click' || (countIn && beat !== 'off')) {
        if (onBeat) click(time, mod(beatSlot, slotsPerBar) === 0)
      } else if (beat === 'drums') {
        const hits = drumHits(mod(i, slotsPerBar), slotsPerBeat, slotsPerBar / slotsPerBeat)
        playDrums(ctx, ctx.destination, time, hits).forEach((osc) => scheduled.push({ osc, time }))
      }
      const under = guitarOn && backingAt && i >= firstIndex ? backingAt(i) : null
      if (under) backing.play(time, under).forEach((osc) => scheduled.push({ osc, time }))
      const voice = guitarOn && i >= firstIndex ? voiceAt(i) : null
      if (voice) guitar.play(time, voice).forEach((osc) => scheduled.push({ osc, time }))
      nextToSchedule++
    }
    const now = ctx.currentTime
    scheduled = scheduled.filter((c) => c.time > now - 0.2)
    // Forget segments that are fully in the past
    while (segments.length > 1 && segments[1].from <= now) segments.shift()
    timer = setTimeout(schedule, 25)
  }

  function tick() {
    const i = Math.floor(positionAt(ctx.currentTime))
    if (stopAt !== null && i >= stopAt) {
      stop()
      onStopAt?.()
      return
    }
    if (i >= length) {
      stop()
      onEnd()
      return
    }
    if (i !== lastReported) {
      lastReported = i
      const countIn = i < firstIndex ? Math.ceil((firstIndex - i) / slotsPerBeat) : 0
      onSlot(i, countIn)
    }
    raf = requestAnimationFrame(tick)
  }

  // Stop anything not yet heard. Optionally let the ringing chord die away quickly too.
  function cancelScheduled(damp = true) {
    const now = ctx.currentTime
    scheduled.forEach(({ osc, time }) => {
      if (time > now) try { osc.stop() } catch {}
    })
    scheduled = scheduled.filter((c) => c.time <= now)
    if (damp) {
      guitar?.damp(now)
      backing?.damp(now)
    }
  }

  function ensureAudio() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (!guitar) {
      guitar = createGuitar(ctx)
      guitar.prewarm(notes)
      if (backingAt) backing = createGuitar(ctx)
    }
    ctx.resume()
  }

  function anchor(index) {
    const time = ctx.currentTime + 0.05
    segments = [{ from: 0, index, time, speed }]
    nextToSchedule = Math.ceil(index)
    lastReported = null
  }

  // countIn: one bar of clicks first. until: stop when this slot is reached.
  function start(fromIndex, { countIn = true, until = null } = {}) {
    ensureAudio()
    stop()
    stopAt = until
    firstIndex = fromIndex
    countInStart = countIn ? fromIndex - slotsPerBar : fromIndex
    anchor(countInStart)
    playing = true
    schedule()
    tick()
  }

  function stop() {
    playing = false
    clearTimeout(timer)
    cancelAnimationFrame(raf)
    if (ctx) cancelScheduled()
  }

  // Jump while playing, keeping time, with no count-in
  function seek(index) {
    if (!playing) return
    cancelScheduled()
    firstIndex = index
    anchor(index)
  }

  function setSpeed(s) {
    if (playing && s !== speed) {
      const now = ctx.currentTime
      const pos = positionAt(now)
      cancelScheduled(false)
      // Anything planned beyond now (e.g. an upcoming loop wrap) is re-planned at the new speed
      segments = segments.filter((seg) => seg.from <= now)
      segments.push({ from: now, index: pos, time: now, speed: s })
      nextToSchedule = Math.ceil(pos)
    }
    speed = s
  }

  return {
    start,
    stop,
    seek,
    setSpeed,
    setLoop: (range) => { loop = range },
    setRampUp: (on) => { rampUp = on },
    setBeat: (b) => { beat = b },
    setGuitar: (on) => {
      guitarOn = on
      if (!on && ctx) {
        guitar.damp(ctx.currentTime)
        backing?.damp(ctx.currentTime)
      }
    },
    // Play one strum straight away, e.g. when the chord diagram is tapped
    preview: (voice) => {
      if (!voice) return
      ensureAudio()
      guitar.play(ctx.currentTime + 0.02, voice)
    },
    isPlaying: () => playing,
  }
}

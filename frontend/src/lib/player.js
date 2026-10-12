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

const LOOKAHEAD = 0.12

export function createPlayer({ length, slotsPerBeat, slotsPerBar, bpm, voiceAt, notes = [], onSlot, onEnd, onSpeed }) {
  let ctx = null
  let guitar = null
  let guitarOn = true
  let clickOn = true
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
      if (loop && nextToSchedule === loop.end && loop.end > loop.start) wrap()
      if (nextToSchedule >= length || timeOf(nextToSchedule) >= horizon) break
      const i = nextToSchedule
      const time = Math.max(timeOf(i), ctx.currentTime)
      const beatSlot = i < firstIndex ? i - countInStart : i
      if (clickOn && mod(beatSlot, slotsPerBeat) === 0) click(time, mod(beatSlot, slotsPerBar) === 0)
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
    if (damp) guitar?.damp(now)
  }

  function ensureAudio() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (!guitar) {
      guitar = createGuitar(ctx)
      guitar.prewarm(notes)
    }
    ctx.resume()
  }

  function anchor(index) {
    const time = ctx.currentTime + 0.05
    segments = [{ from: 0, index, time, speed }]
    nextToSchedule = Math.ceil(index)
    lastReported = null
  }

  function start(fromIndex) {
    ensureAudio()
    stop()
    firstIndex = fromIndex
    countInStart = fromIndex - slotsPerBar
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
    setClick: (on) => { clickOn = on },
    setGuitar: (on) => {
      guitarOn = on
      if (!on && ctx) guitar.damp(ctx.currentTime)
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

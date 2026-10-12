// Audio-clock driven player. Time is counted in strum slots; the Web Audio clock schedules
// the metronome ahead of time and a rAF loop reports which slot is current.
// Slots below `fromIndex` after a start() are the count-in.
const LOOKAHEAD = 0.12

export function createPlayer({ length, slotsPerBeat, slotsPerBar, bpm, onSlot, onEnd }) {
  let ctx = null
  let playing = false
  let speed = 1
  let clickOn = true
  let anchorTime = 0
  let anchorIndex = 0
  let countInStart = 0
  let firstIndex = 0
  let nextToSchedule = 0
  let lastReported = null
  let timer = null
  let raf = null
  let scheduled = []

  const slotDur = () => 60 / (bpm * speed) / slotsPerBeat
  const timeOf = (i) => anchorTime + (i - anchorIndex) * slotDur()
  const position = () => anchorIndex + (ctx.currentTime - anchorTime) / slotDur()
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

  function schedule() {
    const horizon = ctx.currentTime + LOOKAHEAD
    while (nextToSchedule < length && timeOf(nextToSchedule) < horizon) {
      const i = nextToSchedule
      const beatSlot = i < firstIndex ? i - countInStart : i
      if (clickOn && mod(beatSlot, slotsPerBeat) === 0) {
        click(Math.max(timeOf(i), ctx.currentTime), mod(beatSlot, slotsPerBar) === 0)
      }
      nextToSchedule++
    }
    scheduled = scheduled.filter((c) => c.time > ctx.currentTime - 0.2)
    timer = setTimeout(schedule, 25)
  }

  function tick() {
    const i = Math.floor(position())
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

  function cancelScheduled() {
    scheduled.forEach(({ osc }) => {
      try { osc.stop() } catch {}
    })
    scheduled = []
  }

  function anchor(index) {
    anchorIndex = index
    anchorTime = ctx.currentTime + 0.05
    nextToSchedule = Math.ceil(index)
    lastReported = null
  }

  function start(fromIndex) {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
    ctx.resume()
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
    if (playing) {
      const pos = position()
      speed = s
      cancelScheduled()
      anchorIndex = pos
      anchorTime = ctx.currentTime
      nextToSchedule = Math.ceil(pos)
    } else {
      speed = s
    }
  }

  return {
    start,
    stop,
    seek,
    setSpeed,
    setClick: (on) => { clickOn = on },
    isPlaying: () => playing,
  }
}

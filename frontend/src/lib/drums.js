// A simple synthesised drum kit (no samples): kick, snare and hi-hat, scheduled on the
// audio clock like everything else. Each hit returns its sources so they can be cancelled.

let noise = null
function noiseBuffer(ctx) {
  if (noise && noise.sampleRate === ctx.sampleRate) return noise
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const d = noise.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return noise
}

function envelope(ctx, time, peak, length) {
  const g = ctx.createGain()
  g.gain.setValueAtTime(peak, time)
  g.gain.exponentialRampToValueAtTime(0.001, time + length)
  return g
}

function kick(ctx, out, time) {
  const osc = ctx.createOscillator()
  osc.frequency.setValueAtTime(140, time)
  osc.frequency.exponentialRampToValueAtTime(45, time + 0.12)
  osc.connect(envelope(ctx, time, 0.9, 0.3)).connect(out)
  osc.start(time)
  osc.stop(time + 0.32)
  return [osc]
}

function snare(ctx, out, time) {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx)
  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 1200
  src.connect(filter).connect(envelope(ctx, time, 0.45, 0.16)).connect(out)
  const body = ctx.createOscillator()
  body.type = 'triangle'
  body.frequency.value = 190
  body.connect(envelope(ctx, time, 0.3, 0.09)).connect(out)
  src.start(time)
  src.stop(time + 0.18)
  body.start(time)
  body.stop(time + 0.1)
  return [src, body]
}

function hat(ctx, out, time, accent) {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx)
  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 7500
  src.connect(filter).connect(envelope(ctx, time, accent ? 0.16 : 0.09, 0.045)).connect(out)
  src.start(time)
  src.stop(time + 0.06)
  return [src]
}

// Which drums land on a slot, given where it sits in the bar
export function drumHits(slotInBar, slotsPerBeat, beatsPerBar) {
  const beat = Math.floor(slotInBar / slotsPerBeat)
  const onBeat = slotInBar % slotsPerBeat === 0
  // Hi-hats on eighth notes (every slot when slots are eighths or slower)
  const hatEvery = slotsPerBeat >= 4 ? slotsPerBeat / 2 : 1
  const hits = []
  if (slotInBar % hatEvery === 0) hits.push('hat')
  if (onBeat) {
    if (beatsPerBar === 4) hits.push(beat % 2 === 0 ? 'kick' : 'snare') // rock beat
    else if (beatsPerBar === 6) { if (beat === 0) hits.push('kick'); if (beat === 3) hits.push('snare') } // 6/8 lilt
    else if (beatsPerBar === 3) { if (beat === 0) hits.push('kick') } // waltz: boom, chick, chick
    else if (beat === 0) hits.push('kick')
  }
  return hits
}

export function playDrums(ctx, out, time, hits) {
  return hits.flatMap((h) => (h === 'kick' ? kick(ctx, out, time) : h === 'snare' ? snare(ctx, out, time) : hat(ctx, out, time, false)))
}

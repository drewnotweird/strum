import { chords } from '../data/chords.js'

// Where each finger sits in a shape: finger → [string, fret]. A barre counts once.
function fingerSpots(name) {
  const shape = chords[name]
  const spots = new Map()
  shape?.fingers.forEach((finger, string) => {
    if (finger > 0 && !spots.has(finger)) spots.set(finger, [string, shape.frets[string]])
  })
  return spots
}

// How many fingers have to move to get from one shape to the other. A shape that just
// slides along the neck (a power chord moving up two frets) counts as one move.
export function fingersToMove(from, to) {
  const a = fingerSpots(from)
  const b = fingerSpots(to)
  if (a.size && a.size === b.size) {
    const shifts = new Set([...a].map(([f, [s, fret]]) => {
      const there = b.get(f)
      return there ? `${there[0] - s},${there[1] - fret}` : 'gone'
    }))
    if (shifts.size === 1 && !shifts.has('gone')) return shifts.has('0,0') ? 0 : 1
  }
  let moves = 0
  for (const finger of new Set([...a.keys(), ...b.keys()])) {
    const x = a.get(finger)
    const y = b.get(finger)
    if (!x || !y || x[0] !== y[0] || x[1] !== y[1]) moves++
  }
  return moves
}

// The hardest change in a list of steps: the most fingers to move in the least time.
// Only worth pointing out when at least two fingers move.
export function trickiestChange(steps) {
  let best = null
  steps.forEach((step, i) => {
    const next = steps[i + 1]
    if (!next || next.chord === step.chord) return
    const moves = fingersToMove(step.chord, next.chord)
    const score = (moves * 8) / Math.max(2, step.pattern.length)
    if (moves >= 2 && (!best || score > best.score)) best = { from: step.chord, to: next.chord, moves, score }
  })
  return best
}

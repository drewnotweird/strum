import { playable } from '../data/chords.js'

const files = import.meta.glob('../songs/*.json', { eager: true, import: 'default' })

export const songs = Object.values(files).sort(
  (a, b) => a.level - b.level || a.title.localeCompare(b.title)
)

export const getSong = (id) => songs.find((s) => s.id === id)

// Flatten a song's form into the list of chords to play, one entry per chord change.
// A step is "Chord" (default pattern) or "Chord|patternName". With `easy`, hard shapes
// are swapped for their easy versions. Each step carries its section's `cue` (a short
// coaching line shown while it plays) and `feel` ('soft' or 'loud', how hard the guitar plays).
export function buildSteps(song, { easy = false } = {}) {
  const steps = []
  const sectionStarts = []
  song.form.forEach((key, formIndex) => {
    const section = song.sections[key]
    sectionStarts.push({ name: section.name, step: steps.length, formIndex })
    for (let r = 0; r < (section.repeat || 1); r++) {
      section.steps.forEach((raw) => {
        const [chord, patternName = song.defaultPattern] = raw.split('|')
        steps.push({
          chord: playable(chord, easy),
          pattern: song.patterns[patternName].split(/\s+/),
          section: section.name,
          cue: section.cue || null,
          feel: section.feel || null,
          formIndex,
        })
      })
    }
  })
  return { steps, sectionStarts }
}

// One entry per strum slot across the whole song, so the player can count time in slots.
export function buildTimeline(steps) {
  const timeline = []
  const stepStart = []
  steps.forEach((step, s) => {
    stepStart.push(timeline.length)
    step.pattern.forEach((_, slot) => timeline.push({ step: s, slot }))
  })
  return { timeline, stepStart }
}

// Where each chord's last strum falls in its pattern (rests don't count)
export const lastStrumOf = (pattern) => pattern.reduce((last, token, k) => (token === '-' ? last : k), 0)

// Group a section's steps into bars for the chord sheet: chords shorter than a bar share one
export function barsOf(song, steps) {
  const slotsPerBar = song.perBeat * song.beatsPerBar
  const bars = []
  let bar = []
  let filled = 0
  steps.forEach((raw) => {
    const [chord, patternName = song.defaultPattern] = raw.split('|')
    bar.push(chord)
    filled += song.patterns[patternName].split(/\s+/).length
    if (filled >= slotsPerBar) {
      bars.push(bar)
      bar = []
      filled = 0
    }
  })
  if (bar.length) bars.push(bar)
  return bars
}

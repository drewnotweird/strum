import { chords } from '../data/chords.js'

// Melodies for out-of-copyright songs, played one note at a time. A song's `melody` is a list
// of parts, each a string of notes: "3-2:2" is string 3, fret 2, held for 2 slots; "-:4" is a
// rest (at the start it's a lead-in, elsewhere it holds the note before); "|" marks a bar.
// Each note becomes a one-dot "shape", so the player, diagrams and guitar work unchanged.

const OPEN = [40, 45, 50, 55, 59, 64] // low E → high e, as MIDI notes
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export const STRING_NAMES = { 1: 'high E', 2: 'B', 3: 'G', 4: 'D', 5: 'A', 6: 'low E' }

// Where a note sits, in words: "G string, fret 2" or "open B string"
export const whereIs = ({ string, fret }) =>
  fret === 0 ? `open ${STRING_NAMES[string]} string` : `${STRING_NAMES[string]} string, fret ${fret}`

// The one-dot shape for a note (added to the chord shapes the first time it's needed)
export function noteShape(string, fret) {
  const id = `n${string}-${fret}`
  if (!chords[id]) {
    const s = 6 - string
    const frets = Array(6).fill(-1)
    const fingers = Array(6).fill(0)
    frets[s] = fret
    fingers[s] = Math.min(fret, 4) // first position: fret 1 is finger 1, and so on
    chords[id] = { frets, fingers, root: string, label: NAMES[(OPEN[s] + fret) % 12], note: { string, fret } }
  }
  return id
}

// "3-2:2 -:2 …" → [{ string, fret, slots, lead }]
export function parseMelody(text) {
  const notes = []
  let lead = 0
  for (const token of text.split(/\s+/)) {
    if (!token || token === '|') continue
    const [what, length] = token.split(':')
    const slots = Number(length)
    if (what === '-') {
      if (notes.length) notes[notes.length - 1].slots += slots
      else lead += slots
      continue
    }
    const [string, fret] = what.split('-').map(Number)
    notes.push({ string, fret, slots, lead: notes.length ? 0 : lead })
  }
  return notes
}

// Slots a part takes, lead-in included
export const melodyLength = (text) => parseMelody(text).reduce((n, note) => n + note.lead + note.slots, 0)

// The song's melody as a song the player can run: one step per note, each step's pattern
// the note's length (the note on its first slot, then held)
export function melodySong(song) {
  const patterns = {}
  const names = new Map()
  const patternFor = (note) => {
    const key = [...Array(note.lead).fill('-'), String(note.string), ...Array(note.slots - 1).fill('-')].join(' ')
    if (!names.has(key)) {
      names.set(key, `p${names.size}`)
      patterns[`p${names.size - 1}`] = key
    }
    return names.get(key)
  }
  const sections = {}
  song.melody.forEach((part, i) => {
    sections[`m${i}`] = {
      name: part.name,
      ...(part.repeat > 1 && { repeat: part.repeat }),
      steps: parseMelody(part.notes).map((note) => `${noteShape(note.string, note.fret)}|${patternFor(note)}`),
    }
  })
  // The chords underneath, slot by slot across the whole melody (repeats included)
  const backing = song.melody.flatMap((part) =>
    part.chords ? Array.from({ length: part.repeat || 1 }, () => chordTrack(part.chords)).flat() : Array(melodyLength(part.notes) * (part.repeat || 1)).fill(null)
  )
  return {
    ...song,
    capo: 0,
    patterns,
    defaultPattern: 'p0',
    sections,
    form: Object.keys(sections),
    mode: 'melody',
    backing,
  }
}

// A part's chords, "G:6 | C:4 D:2" (chord:slots, "-" for none), as one entry per slot: the
// chord on the slot where it starts, null everywhere else
export function chordTrack(text) {
  const slots = []
  for (const token of text.split(/\s+/)) {
    if (!token || token === '|') continue
    const [chord, length] = token.split(':')
    slots.push(chord === '-' ? null : chord, ...Array(Number(length) - 1).fill(null))
  }
  return slots
}

// Tab for the chord sheet: six lines, high e at the top, two characters per slot
export function melodyTab(text) {
  const lines = { 1: 'e|', 2: 'B|', 3: 'G|', 4: 'D|', 5: 'A|', 6: 'E|' }
  const all = (fill) => Object.keys(lines).forEach((s) => { lines[s] += fill })
  for (const token of text.split(/\s+/)) {
    if (!token) continue
    if (token === '|') { all('|'); continue }
    const [what, length] = token.split(':')
    const slots = Number(length)
    if (what !== '-') {
      const [string, fret] = what.split('-').map(Number)
      Object.keys(lines).forEach((s) => { lines[s] += Number(s) === string ? String(fret).padEnd(2, '-') : '--' })
      all('--'.repeat(slots - 1))
    } else all('--'.repeat(slots))
  }
  all('|')
  return [1, 2, 3, 4, 5, 6].map((s) => lines[s]).join('\n')
}

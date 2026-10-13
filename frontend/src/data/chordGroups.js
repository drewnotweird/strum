import { chordLabel } from './chords.js'

// How the chord library and trainer group the shapes in chords.js
export const CHORD_GROUPS = [
  { name: 'Open chords', chords: ['A', 'Am', 'C', 'D', 'D7', 'E', 'Em', 'F', 'Fm', 'G', 'G7'] },
  { name: 'Extra shapes', chords: ['Asus4', 'Dsus4', 'A7sus4', 'Cadd9', 'Em7', 'G*', 'D6/9'] },
  { name: 'Power chords', chords: ['E5', 'F5', 'F#5', 'G5', 'Ab5', 'A5', 'Bb5', 'B5', 'C5', 'Db5', 'D5'] },
]

// Variant shapes share a chord name, so say which one this is
export const chordTitle = (name) => (name === 'G*' ? 'G (Wonderwall)' : chordLabel(name))

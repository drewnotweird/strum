import { chordLabel } from './chords.js'

// How the chord library and trainer group the shapes in chords.js
export const CHORD_GROUPS = [
  { name: 'Open chords', chords: ['A', 'Am', 'B', 'Bm', 'C', 'Cm', 'D', 'Dm', 'D7', 'E', 'Em', 'F', 'Fm', 'G', 'G7'] },
  { name: 'Extra shapes', chords: ['Asus4', 'Dsus4', 'A7sus4', 'Cadd9', 'Em7', 'G*', 'D6/9', 'Fmaj7', 'Bm7'] },
  { name: 'Power chords', chords: ['E5', 'F5', 'F#5', 'G5', 'Ab5', 'A5', 'Bb5', 'B5', 'C5', 'Db5', 'D5'] },
  { name: 'Blues boogie', chords: ['A5d', 'A6', 'D5d', 'D6', 'E5d', 'E6'] },
]

// Variant shapes share a chord name, so say which one this is
const TITLES = { 'G*': 'G (Wonderwall)', A5d: 'A5 (two strings)', D5d: 'D5 (two strings)', E5d: 'E5 (two strings)' }
export const chordTitle = (name) => TITLES[name] || chordLabel(name)

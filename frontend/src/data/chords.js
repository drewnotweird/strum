// Chord shapes, strings listed low E → high e.
// frets: -1 = don't play, 0 = open. fingers: 1 index … 4 pinky, 0 = none.
// root: the string the bass note sits on (6 = low E), used by picking patterns.
export const chords = {
  // Open chords
  A:  { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], root: 5 },
  Am: { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], root: 5 },
  Asus4: { frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0], root: 5 },
  C:  { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], root: 5 },
  D:  { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], root: 4 },
  Dm: { frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1], root: 4 },
  E:  { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0], root: 6 },
  Em: { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0], root: 6 },
  // Easy four-string F. The full barre comes later.
  F:  { frets: [-1, -1, 3, 2, 1, 1], fingers: [0, 0, 3, 2, 1, 1], root: 4 },
  G:  { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], root: 6 },
  D7: { frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3], root: 4 },
  G7: { frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1], root: 6 },
  // Easy-chords mode swaps (see EASY below)
  Fmaj7: { frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0], root: 4 },
  Bm7: { frets: [-1, 2, 0, 2, 0, 2], fingers: [0, 1, 0, 2, 0, 3], root: 5 },
  // Easy four-string Bm: no barre needed
  Bm: { frets: [-1, -1, 4, 4, 3, 2], fingers: [0, 0, 3, 4, 2, 1], root: 4 },
  // Easy four-string Fm, the little sister of the easy F
  Fm: { frets: [-1, -1, 3, 1, 1, 1], fingers: [0, 0, 3, 1, 1, 1], root: 4 },
  // Easy four-string B and Cm (Creep): the top of the barre shapes, no barre needed
  B:  { frets: [-1, -1, 4, 4, 4, 2], fingers: [0, 0, 2, 3, 4, 1], root: 4 },
  Cm: { frets: [-1, -1, 5, 5, 4, 3], fingers: [0, 0, 3, 4, 2, 1], root: 4 },
  // A Horse With No Name's second chord: two fingers, everything else open
  'D6/9': { frets: [2, 0, 0, 2, 0, 0], fingers: [1, 0, 0, 2, 0, 0], root: 6 },

  // Wonderwall shapes: ring and pinky stay put on the top two strings
  Em7:    { frets: [0, 2, 2, 0, 3, 3], fingers: [0, 1, 2, 0, 3, 4], root: 6 },
  'G*':   { frets: [3, 2, 0, 0, 3, 3], fingers: [2, 1, 0, 0, 3, 4], root: 6, label: 'G' },
  Dsus4:  { frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 3, 4], root: 4 },
  A7sus4: { frets: [-1, 0, 2, 0, 3, 3], fingers: [0, 0, 1, 0, 3, 4], root: 5 },
  Cadd9:  { frets: [-1, 3, 2, 0, 3, 3], fingers: [0, 2, 1, 0, 3, 4], root: 5 },

  // Power chords
  E5:    { frets: [0, 2, 2, -1, -1, -1], fingers: [0, 1, 2, 0, 0, 0], root: 6 },
  'F#5': { frets: [2, 4, 4, -1, -1, -1], fingers: [1, 3, 4, 0, 0, 0], root: 6 },
  G5:    { frets: [3, 5, 5, -1, -1, -1], fingers: [1, 3, 4, 0, 0, 0], root: 6 },
  A5:    { frets: [-1, 0, 2, 2, -1, -1], fingers: [0, 0, 1, 2, 0, 0], root: 5 },
  Bb5:   { frets: [-1, 1, 3, 3, -1, -1], fingers: [0, 1, 3, 4, 0, 0], root: 5 },
  B5:    { frets: [-1, 2, 4, 4, -1, -1], fingers: [0, 1, 3, 4, 0, 0], root: 5 },
  F5:    { frets: [1, 3, 3, -1, -1, -1], fingers: [1, 3, 4, 0, 0, 0], root: 6 },
  Ab5:   { frets: [4, 6, 6, -1, -1, -1], fingers: [1, 3, 4, 0, 0, 0], root: 6 },
  Db5:   { frets: [-1, 4, 6, 6, -1, -1], fingers: [0, 1, 3, 4, 0, 0], root: 5 },
  C5:    { frets: [-1, 3, 5, 5, -1, -1], fingers: [0, 1, 3, 4, 0, 0], root: 5 },
  D5:    { frets: [-1, -1, 0, 2, 3, -1], fingers: [0, 0, 0, 1, 2, 0], root: 4 },

  // The blues boogie: a two-string 5 shape, then the pinky reaches two frets up for the 6
  A5d: { frets: [-1, 0, 2, -1, -1, -1], fingers: [0, 0, 1, 0, 0, 0], root: 5, label: 'A5' },
  A6:  { frets: [-1, 0, 4, -1, -1, -1], fingers: [0, 0, 4, 0, 0, 0], root: 5 },
  D5d: { frets: [-1, -1, 0, 2, -1, -1], fingers: [0, 0, 0, 1, 0, 0], root: 4, label: 'D5' },
  D6:  { frets: [-1, -1, 0, 4, -1, -1], fingers: [0, 0, 0, 4, 0, 0], root: 4 },
  E5d: { frets: [0, 2, -1, -1, -1, -1], fingers: [0, 1, 0, 0, 0, 0], root: 6, label: 'E5' },
  E6:  { frets: [0, 4, -1, -1, -1, -1], fingers: [0, 4, 0, 0, 0, 0], root: 6 },
}

export const chordLabel = (name) => chords[name]?.label || name

// Easy-chords mode: shapes that are hard for small hands, and what to play instead.
// The swaps sound close enough to sit in the same song.
export const EASY = {
  F: 'Fmaj7', // no barre: lift the first finger off the B string
  Bm: 'Bm7', // two strings open, no stretch
}

export const playable = (name, easy) => (easy && EASY[name]) || name

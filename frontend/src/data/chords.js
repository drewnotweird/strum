// Chord shapes, strings listed low E → high e.
// frets: -1 = don't play, 0 = open. fingers: 1 index … 4 pinky, 0 = none.
// root: the string the bass note sits on (6 = low E), used by picking patterns.
export const chords = {
  // Open chords
  A:  { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], root: 5 },
  Am: { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], root: 5 },
  C:  { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], root: 5 },
  D:  { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], root: 4 },
  E:  { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0], root: 6 },
  Em: { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0], root: 6 },
  // Easy four-string F. The full barre comes later.
  F:  { frets: [-1, -1, 3, 2, 1, 1], fingers: [0, 0, 3, 2, 1, 1], root: 4 },
  G:  { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], root: 6 },

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
}

export const chordLabel = (name) => chords[name]?.label || name

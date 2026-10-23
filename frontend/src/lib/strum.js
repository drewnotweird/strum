import { chords } from '../data/chords.js'

// The marks a strum or picking pattern is written in, one per slot:
//   D down   U up   - rest (keep the arm moving, miss the strings)
//   X chuck: a muted slap, the strumming hand lands flat on the strings
//   M palm-muted down: the side of the hand rests on the strings by the bridge
//   B the chord's bass string, picked   1–6 a string, picked (1 is the thinnest)
export const TOKEN = /^(D|U|-|X|M|B|[1-6])$/

export const isPick = (token) => token === 'B' || /^\d$/.test(token)

// What a slot shows
export function glyph(token, chord) {
  if (token === 'D' || token === 'M') return '↓'
  if (token === 'U') return '↑'
  if (token === '-') return '·'
  if (token === 'X') return '×'
  if (token === 'B') return String(chords[chord]?.root ?? 'B')
  return token
}

// Extra class for a slot, so chucks and palm mutes look different from open strums
export const slotKind = (token) => (token === '-' ? 'is-rest' : token === 'X' ? 'is-chuck' : token === 'M' ? 'is-muted' : '')

const WORDS = { D: 'down', U: 'up', '-': 'rest', X: 'chuck', M: 'palm-muted down' }

// What a screen reader says for a pattern
export function describePattern(pattern, chord) {
  const words = pattern.map((t) => WORDS[t] || `string ${glyph(t, chord)}`)
  return `${pattern.some(isPick) ? 'Picking' : 'Strum'} pattern: ${words.join(', ')}`
}

import { chordLabel } from '../data/chords.js'

// Techniques a song practises, worked out from its chart rather than tagged by hand, so
// they're always right. Shown on the song page, filterable on the Songs page, and tracked
// on Progress as he plays them.
export const SKILLS = {
  'power-chords': { name: 'Power chords', blurb: 'Rock shapes on two or three strings' },
  'bass-strums': { name: 'Bass strums', blurb: 'Pick a bass note, then strum' },
  chucks: { name: 'Chucks', blurb: 'A muted slap on the strings' },
  'palm-muting': { name: 'Palm muting', blurb: 'Chunky, damped down-strums' },
  picking: { name: 'Picking', blurb: 'One string at a time' },
}

const strums = new Set(['D', 'U', 'X', 'M'])

// The techniques in one chord step: its chord, and the pattern it's played with
export function stepSkills(chord, pattern) {
  const found = []
  if (/5$/.test(chordLabel(chord))) found.push('power-chords')
  const picks = pattern.some((t) => /^\d$/.test(t))
  if (!picks && pattern.includes('B') && pattern.some((t) => strums.has(t))) found.push('bass-strums')
  if (pattern.includes('X')) found.push('chucks')
  if (pattern.includes('M')) found.push('palm-muting')
  if (picks) found.push('picking')
  return found
}

// Every technique in a song, in the order SKILLS lists them
export function songSkills(song) {
  const found = new Set()
  Object.values(song.sections).forEach((section) =>
    section.steps.forEach((raw) => {
      const [chord, patternName = song.defaultPattern] = raw.split('|')
      stepSkills(chord, song.patterns[patternName].split(/\s+/)).forEach((s) => found.add(s))
    })
  )
  return Object.keys(SKILLS).filter((id) => found.has(id))
}

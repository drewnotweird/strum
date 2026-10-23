import { chordLabel } from '../data/chords.js'
import { songSkills } from './skills.js'

// The song list's search, kept separate from the page so it can be tested.

export const songChords = (song) => {
  const names = new Set()
  Object.values(song.sections).forEach((s) => s.steps.forEach((raw) => names.add(chordLabel(raw.split('|')[0]))))
  return [...names]
}

export function makeCatalogue(songs) {
  const catalogue = songs.map((song) => {
    const chords = songChords(song)
    return {
      song,
      chords,
      chordSet: new Set(chords.map((c) => c.toLowerCase())),
      skills: songSkills(song),
      text: `${song.title} ${song.artist}`.toLowerCase(),
    }
  })
  return { catalogue, allChords: new Set(catalogue.flatMap((s) => [...s.chordSet])) }
}

// If every word in the search is a chord name, it's a chord search:
// - one chord ("C"): songs that use it
// - several ("G C D"): songs you can play with nothing but those
// Otherwise it matches song titles and artists.
export function search(
  { catalogue, allChords },
  { query = '', level = null, learnedOnly = false, learned = [], favouritesOnly = false, favourites = [], tag = null, skill = null, knownChords = null } = {}
) {
  const q = query.trim().toLowerCase()
  const tokens = q.split(/[\s,]+/).filter(Boolean)
  const chordQuery = tokens.length > 0 && tokens.every((t) => allChords.has(t)) ? new Set(tokens) : null

  const results = catalogue.filter((entry) => {
    if (level && entry.song.level !== level) return false
    if (learnedOnly && !learned.includes(entry.song.id)) return false
    if (favouritesOnly && !favourites.includes(entry.song.id)) return false
    if (tag && !(entry.song.tags || []).includes(tag)) return false
    if (skill && !entry.skills.includes(skill)) return false
    // Chords I know: only songs that need nothing beyond them
    if (knownChords && ![...entry.chordSet].every((c) => knownChords.has(c))) return false
    if (!q) return true
    if (!chordQuery) return entry.text.includes(q)
    if (chordQuery.size === 1) return entry.chordSet.has(tokens[0])
    return [...entry.chordSet].every((c) => chordQuery.has(c))
  })
  return { results, chordQuery }
}

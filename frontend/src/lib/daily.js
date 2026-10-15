import { dayKey } from './store.js'

function hash(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0
  return h
}

// Song of the day: the same for everyone on a given date. If it's one he's already
// learned, the next song he hasn't learned takes its place.
export function songOfTheDay(songs, learned = [], date = new Date()) {
  if (!songs.length) return null
  const list = [...songs].sort((a, b) => a.id.localeCompare(b.id))
  const start = hash(dayKey(date)) % list.length
  for (let i = 0; i < list.length; i++) {
    const song = list[(start + i) % list.length]
    if (!learned.includes(song.id)) return song
  }
  return list[start]
}

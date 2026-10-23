import { streakOf, totalSeconds } from './store.js'
import { SKILLS } from './skills.js'

// Badges: little rewards for practising. Once earned they're kept (in the store), so a
// broken streak doesn't take a badge away.
const OPEN_CHORDS = ['A', 'Am', 'C', 'D', 'E', 'Em', 'G']
const POWER_CHORDS = ['E5', 'F5', 'F#5', 'G5', 'Ab5', 'A5', 'Bb5', 'B5', 'C5', 'Db5', 'D5']
const played = (s, skill) => (s.skillsPlayed || []).includes(skill)

export const BADGES = [
  { id: 'first-song', icon: '🎸', name: 'First song', how: 'Learn a song', test: (s) => s.learned.length >= 1 },
  { id: 'five-songs', icon: '⭐', name: 'Five songs', how: 'Learn 5 songs', test: (s) => s.learned.length >= 5 },
  { id: 'ten-songs', icon: '🏆', name: 'Ten songs', how: 'Learn 10 songs', test: (s) => s.learned.length >= 10 },
  { id: 'streak-3', icon: '🔥', name: 'On fire', how: 'Practise 3 days in a row', test: (s) => streakOf(s.days) >= 3 },
  { id: 'streak-7', icon: '🚀', name: 'Week of rock', how: 'Practise 7 days in a row', test: (s) => streakOf(s.days) >= 7 },
  {
    id: 'daily-goal', icon: '🎯', name: 'Goal!', how: 'Hit your daily goal',
    test: (s) => Object.values(s.days).some((sec) => sec >= s.goalMinutes * 60),
  },
  { id: 'hour', icon: '⏱️', name: 'An hour in', how: 'Practise for an hour in total', test: (s) => totalSeconds(s.days) >= 3600 },
  {
    id: 'open-chords', icon: '🖐️', name: 'Open chords', how: 'Play every open chord: A Am C D E Em G',
    test: (s) => OPEN_CHORDS.every((c) => s.playedChords.includes(c)),
  },
  {
    id: 'power', icon: '⚡', name: 'Power player', how: 'Play 3 different power chords',
    test: (s) => s.playedChords.filter((c) => POWER_CHORDS.includes(c)).length >= 3,
  },
  { id: 'chucks', icon: '✋', name: 'Chuck it', how: 'Play some chucks', test: (s) => played(s, 'chucks') },
  { id: 'palm-mute', icon: '🤘', name: 'Chug chug', how: 'Palm-mute some down-strums', test: (s) => played(s, 'palm-muting') },
  { id: 'picker', icon: '☝️', name: 'Picker', how: 'Pick a song one string at a time', test: (s) => played(s, 'picking') },
  {
    id: 'toolbox', icon: '🧰', name: 'Toolbox', how: 'Play every technique: power chords, bass strums, chucks, palm muting and picking',
    test: (s) => Object.keys(SKILLS).every((id) => played(s, id)),
  },
]

// Badges whose test now passes but which haven't been awarded yet
export const newlyEarned = (state) => BADGES.filter((b) => !state.badges.includes(b.id) && b.test(state))

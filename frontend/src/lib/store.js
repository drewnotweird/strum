import { useSyncExternalStore } from 'react'

// Everything Strum remembers about the player, kept in this browser only (no login):
// preferences, songs marked as learned, seconds practised per day, chords played and
// badges earned.
const KEY = 'strum'
const DEFAULTS = {
  lefty: false,
  easyChords: false,
  beat: 'click', // 'click' | 'drums' | 'off'
  goalMinutes: 10,
  learned: [],
  days: {},
  playedChords: [],
  badges: [],
  favourites: [],
  knownChords: [], // ticked on the Songs page: "show me songs I can play with these"
  lastPlayed: null, // { id, step, section } for "Keep going" on the home page
  speeds: {}, // song id → the speed he last played it at, so it opens where he left off
  skillsPlayed: [], // techniques he's played (see lib/skills.js), for Progress and badges
}

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return { ...DEFAULTS }
  }
}

let state = load()
const listeners = new Set()

function set(patch) {
  state = { ...state, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {}
  listeners.forEach((fn) => fn())
}

const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export const useStore = (pick) => pick(useSyncExternalStore(subscribe, () => state))

export const getState = () => state
export const subscribeStore = subscribe

export const setLefty = (lefty) => set({ lefty })
export const setEasyChords = (easyChords) => set({ easyChords })
export const setBeat = (beat) => set({ beat })

export const setGoalMinutes = (goalMinutes) => set({ goalMinutes })

export function addPlayedChord(name) {
  if (!state.playedChords.includes(name)) set({ playedChords: [...state.playedChords, name] })
}

export const addBadges = (ids) => set({ badges: [...state.badges, ...ids] })

export const setSongSpeed = (id, speed) => {
  if (state.speeds[id] !== speed) set({ speeds: { ...state.speeds, [id]: speed } })
}

export function addSkillsPlayed(ids) {
  const fresh = ids.filter((id) => !state.skillsPlayed.includes(id))
  if (fresh.length) set({ skillsPlayed: [...state.skillsPlayed, ...fresh] })
}

export const toggleFavourite = (id) =>
  set({ favourites: state.favourites.includes(id) ? state.favourites.filter((x) => x !== id) : [...state.favourites, id] })

export const setKnownChords = (knownChords) => set({ knownChords })

export function setLastPlayed(lastPlayed) {
  const prev = state.lastPlayed
  if (prev && lastPlayed && prev.id === lastPlayed.id && prev.step === lastPlayed.step) return
  set({ lastPlayed })
}

export const toggleLearned = (id) =>
  set({ learned: state.learned.includes(id) ? state.learned.filter((x) => x !== id) : [...state.learned, id] })

// Local calendar date, e.g. 2026-10-12
export const dayKey = (date = new Date()) => date.toLocaleDateString('en-CA')

export function addPractice(seconds) {
  if (seconds < 1) return
  const today = dayKey()
  set({ days: { ...state.days, [today]: (state.days[today] || 0) + Math.round(seconds) } })
}

// A day counts once there's half a minute of playing in it
const PRACTICE_DAY = 30

// Days in a row with practice, ending today (or yesterday, so it isn't lost before
// today's practice has happened)
export function streakOf(days) {
  const practised = (d) => (days[dayKey(d)] || 0) >= PRACTICE_DAY
  const d = new Date()
  if (!practised(d)) d.setDate(d.getDate() - 1)
  let count = 0
  while (practised(d)) {
    count++
    d.setDate(d.getDate() - 1)
  }
  return count
}

export const practisedToday = (days) => (days[dayKey()] || 0) >= PRACTICE_DAY

export const secondsToday = (days) => days[dayKey()] || 0

// Longest run of practice days ever (for the progress page)
export function bestStreak(days) {
  const practisedDays = Object.keys(days).filter((k) => days[k] >= PRACTICE_DAY).sort()
  let best = 0
  let run = 0
  let prev = null
  for (const key of practisedDays) {
    const d = new Date(`${key}T12:00:00`)
    run = prev && (d - prev) / 86400000 === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

// Minutes practised on each of the last `count` days, oldest first
export function lastDays(days, count = 7) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (count - 1 - i))
    return { date: d, minutes: Math.round((days[dayKey(d)] || 0) / 60) }
  })
}
export const totalSeconds = (days) => Object.values(days).reduce((a, b) => a + b, 0)

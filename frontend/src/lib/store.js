import { useSyncExternalStore } from 'react'

// Everything Strum remembers about the player, kept in this browser only (no login):
// left-handed mode, songs marked as learned, and seconds practised per day.
const KEY = 'strum'
const DEFAULTS = { lefty: false, learned: [], days: {} }

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

export const setLefty = (lefty) => set({ lefty })

export const toggleLearned = (id) =>
  set({ learned: state.learned.includes(id) ? state.learned.filter((x) => x !== id) : [...state.learned, id] })

// Local calendar date, e.g. 2026-10-12
const dayKey = (date = new Date()) => date.toLocaleDateString('en-CA')

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

import { flushSync } from 'react-dom'

// Remembers where the song list was scrolled to, so coming back lands in the same place
let listScroll = 0
// Resolves a history-back transition once the list has rendered (see listReady)
let pending = null

// Elements that can travel between pages carry data-vt (what it is) and data-vt-song (whose).
// They only get a view-transition-name while their song is the one travelling: if every card
// on the list were named, going to a page without that song (tuner, chords, progress) would
// leave all those titles hanging in place, fading out on top of the page sliding away.
function nameShared(song, on) {
  if (!song) return
  document.querySelectorAll(`[data-vt-song="${CSS.escape(song)}"]`).forEach((el) => {
    el.style.viewTransitionName = on ? `${el.dataset.vt}-${song}` : ''
  })
}

// Navigate with a View Transition: the old page slides out, the new one slides in, and
// `shared` (a song id) has its title, artist and pick travel between the two pages.
export function go(navigate, to, direction, shared) {
  // Going back to a list we came from: step back in history rather than pushing a new
  // entry, so the phone's own back gesture keeps working as expected afterwards
  const historyBack = direction === 'back' && window.history.state?.idx > 0

  const swap = () => {
    if (historyBack) {
      // History navigation renders asynchronously; the list calls listReady() when it's in
      return new Promise((resolve) => {
        pending = resolve
        setTimeout(resolve, 500)
        navigate(-1)
      })
    }
    flushSync(() => {
      // Only the song list's scroll position is worth coming back to
      if (direction === 'forward' && window.location.pathname === import.meta.env.BASE_URL) listScroll = window.scrollY
      navigate(to)
    })
    window.scrollTo(0, direction === 'back' ? listScroll : 0)
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!document.startViewTransition || reduced) {
    swap()
    return
  }

  // Name the shared song on the old page now, and on the new page once it has rendered
  const update = async () => {
    await swap()
    nameShared(shared, true)
  }
  nameShared(shared, true)
  const root = document.documentElement
  root.dataset.nav = direction
  const transition = document.startViewTransition(update)
  // An interrupted transition (e.g. the window resizing) still swaps the page, so ignore it
  transition.ready.catch(() => {})
  transition.finished.finally(() => {
    delete root.dataset.nav
    nameShared(shared, false)
  })
}

// Called by the song list once it has rendered after a back navigation
export function listReady() {
  window.scrollTo(0, listScroll)
  pending?.()
  pending = null
}

// Marks an element as one that travels with its song (see nameShared)
export const travels = (what, id) => ({ 'data-vt': what, 'data-vt-song': id })

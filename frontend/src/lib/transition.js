import { flushSync } from 'react-dom'

// Remembers where the song list was scrolled to, so coming back lands in the same place
let listScroll = 0
// Resolves a history-back transition once the list has rendered (see listReady)
let pending = null

// Navigate with a View Transition: the old page slides out, the new one slides in, and
// elements sharing a view-transition-name (the song title) travel between the two.
export function go(navigate, to, direction) {
  // Going back to a list we came from: step back in history rather than pushing a new
  // entry, so the phone's own back gesture keeps working as expected afterwards
  const historyBack = direction === 'back' && window.history.state?.idx > 0

  const update = () => {
    if (historyBack) {
      // History navigation renders asynchronously; the list calls listReady() when it's in
      return new Promise((resolve) => {
        pending = resolve
        setTimeout(resolve, 500)
        navigate(-1)
      })
    }
    flushSync(() => {
      if (direction === 'forward') listScroll = window.scrollY
      navigate(to)
    })
    window.scrollTo(0, direction === 'back' ? listScroll : 0)
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!document.startViewTransition || reduced) {
    update()
    return
  }

  const root = document.documentElement
  root.dataset.nav = direction
  const transition = document.startViewTransition(update)
  // An interrupted transition (e.g. the window resizing) still swaps the page, so ignore it
  transition.ready.catch(() => {})
  transition.finished.finally(() => delete root.dataset.nav)
}

// Called by the song list once it has rendered after a back navigation
export function listReady() {
  window.scrollTo(0, listScroll)
  pending?.()
  pending = null
}

export const titleTransitionName = (id) => ({ viewTransitionName: `title-${id}` })
// inline-block: a named element must not break across lines, or the transition is dropped
export const artistTransitionName = (id) => ({ viewTransitionName: `artist-${id}`, display: 'inline-block' })

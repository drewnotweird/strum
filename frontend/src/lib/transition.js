import { flushSync } from 'react-dom'

// Where each page was scrolled to, so going back (or back to a tab) lands in the same place
const scrolls = new Map()
const here = () => window.location.pathname + window.location.search
// Resolves a history-back transition once the page has rendered (see pageReady)
let pending = null

// Navigate with a View Transition. direction:
// - 'forward': the new page rises in from below (opening a song, a tool)
// - 'back': the reverse; steps back in history when there is somewhere to go back to
// - 'tab': switching between the tab bar's pages, a quick crossfade
// Elements sharing a view-transition-name (a song's title, artist and pick) travel between pages.
export function go(navigate, to, direction) {
  // Going back to a page we came from: step back in history rather than pushing a new
  // entry, so the phone's own back gesture keeps working as expected afterwards
  const historyBack = direction === 'back' && window.history.state?.idx > 0

  const update = () => {
    scrolls.set(here(), window.scrollY)
    if (historyBack) {
      // History navigation renders asynchronously; the page calls pageReady() when it's in
      return new Promise((resolve) => {
        pending = resolve
        setTimeout(resolve, 500)
        navigate(-1)
      })
    }
    flushSync(() => navigate(to))
    window.scrollTo(0, direction === 'forward' ? 0 : scrolls.get(here()) || 0)
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

// Called by a page once it has rendered after a back navigation (ours or the browser's)
export function pageReady() {
  window.scrollTo(0, scrolls.get(here()) || 0)
  pending?.()
  pending = null
}

export const titleTransitionName = (id) => ({ viewTransitionName: `title-${id}` })
// inline-block: a named element must not break across lines, or the transition is dropped
export const artistTransitionName = (id) => ({ viewTransitionName: `artist-${id}`, display: 'inline-block' })

// Props for a <Link> that navigates with a transition (and still opens in a new tab
// with Cmd/Ctrl-click like an ordinary link)
export const goLink = (navigate, to, direction = 'forward') => ({
  to,
  onClick: (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    go(navigate, to, direction)
  },
})

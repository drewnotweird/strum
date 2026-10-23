import { flushSync } from 'react-dom'

// Where each page was scrolled to, so going back (or back to a tab) lands in the same place
const scrolls = new Map()
const here = () => window.location.pathname + window.location.search
// Resolves a history-back transition once the page has rendered (see pageReady)
let pending = null

// Elements only receive a view-transition name while their song is travelling.
function nameShared(song, on) {
  if (!song) return
  const named = new Set()
  document.querySelectorAll(`[data-vt-song="${CSS.escape(song)}"]`).forEach((el) => {
    if (named.has(el.dataset.vt)) return
    named.add(el.dataset.vt)
    el.style.viewTransitionName = on ? `${el.dataset.vt}-${song}` : ''
  })
}

// The tab bar's order, so switching tabs can slide the right way
const TAB_ORDER = ['/', '/songs', '/practice', '/progress']
const PRACTICE_PAGES = ['/tuner', '/changes', '/strums', '/chords']
const appPath = (path) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const p = (path.startsWith(base) ? path.slice(base.length) : path).split('?')[0] || '/'
  return PRACTICE_PAGES.includes(p) ? '/practice' : p
}
const tabIndex = (path) => TAB_ORDER.indexOf(appPath(path))

// 'tab' becomes 'tab-next' or 'tab-prev' depending on where the target sits in the tab bar
function tabDirection(to) {
  const from = tabIndex(window.location.pathname)
  const target = tabIndex(to)
  if (from < 0 || target < 0 || from === target) return 'tab'
  return target > from ? 'tab-next' : 'tab-prev'
}

// Navigate with a View Transition. direction:
// - 'forward': the new page rises in from below (opening a song, a tool)
// - 'back': the reverse; steps back in history when there is somewhere to go back to
// - 'tab': switching between the tab bar's pages. No View Transition (rapid taps could
//   leave a blank page): the new page just eases in from the side its tab sits on
export function go(navigate, to, direction, shared) {
  if (direction === 'tab') direction = tabDirection(to)
  // Going back to a page we came from: step back in history rather than pushing a new
  // entry, so the phone's own back gesture keeps working as expected afterwards
  const historyBack = direction === 'back' && window.history.state?.idx > 0

  const swap = () => {
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
    focusPage()
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    swap()
    return
  }

  if (direction.startsWith('tab')) {
    const page = document.querySelector('main')
    if (!page || typeof page.animate !== 'function') {
      swap()
      return
    }
    swap()
    const nextPage = document.querySelector('main')
    if (!nextPage) return
    nextPage.getAnimations().forEach((animation) => {
      if (animation.effect?.target === nextPage) animation.cancel()
    })
    // A short nudge from the tab's side; it starts mostly visible so fast tapping never blanks
    const dx = { 'tab-next': 18, 'tab-prev': -18 }[direction] || 0
    nextPage.animate(
      [{ opacity: 0.6, transform: `translateX(${dx}px)` }, { opacity: 1, transform: 'none' }],
      { duration: 240, easing: 'cubic-bezier(0.3, 1, 0.4, 1)' }
    )
    return
  }

  if (!document.startViewTransition) {
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

// Called by a page once it has rendered after a back navigation (ours or the browser's)
export function pageReady() {
  window.scrollTo(0, scrolls.get(here()) || 0)
  focusPage()
  pending?.()
  pending = null
}

// A new page takes focus at its heading, so keyboard and screen reader users start there
// (and hear where they are) rather than on the link they just used, now gone
function focusPage() {
  const heading = document.querySelector('main h1')
  if (!heading) return
  heading.tabIndex = -1
  heading.focus({ preventScroll: true })
}

// Props for a <Link> that navigates with a transition (and still opens in a new tab
// with Cmd/Ctrl-click like an ordinary link)
export const goLink = (navigate, to, direction = 'forward', shared) => ({
  to,
  onClick: (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    go(navigate, to, direction, shared)
  },
})
// Marks an element as one that travels with its song (see nameShared)
export const travels = (what, id) => ({ 'data-vt': what, 'data-vt-song': id })

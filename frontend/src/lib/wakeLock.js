// Keeps the screen on while something is playing, so a phone or tablet doesn't dim and
// lock while both hands are on the guitar. The browser drops the lock when the page is
// hidden, so it's taken again when the page comes back.
let lock = null
let wanted = false

export async function keepAwake(on) {
  wanted = on
  if (!on) {
    lock?.release().catch(() => {})
    lock = null
    return
  }
  if (lock || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return
  try {
    lock = await navigator.wakeLock.request('screen')
    lock.addEventListener('release', () => { lock = null })
  } catch {
    // Not allowed right now (e.g. battery saver); playing still works
  }
}

document.addEventListener('visibilitychange', () => {
  if (wanted && document.visibilityState === 'visible') keepAwake(true)
})

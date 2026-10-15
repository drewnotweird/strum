// A short burst of confetti from a point on screen, for finishing a song or earning a
// badge. Plain DOM pieces animated with the Web Animations API, removed when done.
const COLOURS = ['#2f8cf0', '#ffc800', '#ff6b6b', '#4bb543', '#7b61ff', '#ff9f43']

export function confetti({ x = window.innerWidth / 2, y = window.innerHeight / 3, count = 70 } = {}) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const layer = document.createElement('div')
  layer.className = 'confetti'
  layer.setAttribute('aria-hidden', 'true')
  document.body.appendChild(layer)

  const pieces = Array.from({ length: count }, (_, i) => {
    const el = document.createElement('span')
    el.style.background = COLOURS[i % COLOURS.length]
    el.style.left = `${x}px`
    el.style.top = `${y}px`
    if (i % 3 === 0) el.style.borderRadius = '50%'
    layer.appendChild(el)
    const angle = Math.random() * Math.PI * 2
    const speed = 160 + Math.random() * 320
    const dx = Math.cos(angle) * speed
    const dy = Math.sin(angle) * speed - 220
    const spin = (Math.random() - 0.5) * 1080
    return el.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.4 },
        { transform: `translate(${dx * 1.3}px, ${dy + 520}px) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: 1400 + Math.random() * 700, easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)', fill: 'forwards' }
    ).finished
  })
  Promise.allSettled(pieces).then(() => layer.remove())
}

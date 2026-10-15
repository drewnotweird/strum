import { useEffect, useState } from 'react'
import { addBadges, getState, subscribeStore } from '../lib/store.js'
import { newlyEarned } from '../lib/badges.js'
import { confetti } from '../lib/confetti.js'

// Watches the practice record and pops up a celebration when a badge is earned
export default function Toaster() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const check = () => {
      const earned = newlyEarned(getState())
      if (!earned.length) return
      addBadges(earned.map((b) => b.id))
      setToasts((list) => [...list, ...earned])
      confetti({ x: window.innerWidth / 2, y: window.innerHeight - 120, count: 50 })
      earned.forEach((b) => setTimeout(() => setToasts((list) => list.filter((t) => t.id !== b.id)), 4500))
    }
    check()
    return subscribeStore(check)
  }, [])

  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((b) => (
        <div key={b.id} className="toast">
          <span className="toast__icon" aria-hidden="true">{b.icon}</span>
          <span>
            <strong>New badge: {b.name}</strong>
            <span className="toast__how">{b.how}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

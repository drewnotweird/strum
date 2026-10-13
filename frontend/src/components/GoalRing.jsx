// A ring that fills as today's practice heads towards the daily goal
export default function GoalRing({ share, size = 26 }) {
  const c = 2 * Math.PI * 15
  return (
    <svg className={`goal-ring ${share >= 1 ? 'is-done' : ''}`} viewBox="0 0 36 36" width={size} height={size} aria-hidden="true" focusable="false">
      <circle className="goal-ring__track" cx="18" cy="18" r="15" />
      <circle className="goal-ring__fill" cx="18" cy="18" r="15" strokeDasharray={`${Math.min(1, share) * c} ${c}`} transform="rotate(-90 18 18)" />
    </svg>
  )
}

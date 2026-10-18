import { chords } from '../data/chords.js'
import { useStore } from '../lib/store.js'

const FRETS = 5
const STRING_NAMES = ['low E', 'A', 'D', 'G', 'B', 'high E']
const ordinal = (n) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`

// e.g. "Am chord: low E not played, A open, D 2nd fret, …"
function describe(name, shape) {
  const parts = shape.frets.map((fret, s) => {
    const string = STRING_NAMES[s]
    if (fret < 0) return `${string} not played`
    if (fret === 0) return `${string} open`
    return `${string} ${ordinal(fret)} fret`
  })
  return `${shape.label || name} chord: ${parts.join(', ')}`
}

// `decorative`: the chord is already named nearby, so screen readers skip the picture
export default function ChordDiagram({ name, className = '', decorative = false }) {
  const lefty = useStore((s) => s.lefty)
  const shape = chords[name]
  if (!shape) return <div className={`diagram diagram--missing ${className}`}>?</div>

  const pressed = shape.frets.filter((f) => f > 0)
  const base = Math.max(...pressed, 0) > FRETS ? Math.min(...pressed) : 1

  const w = 100
  const h = 120
  const left = 10
  const top = 22
  const gap = (w - left * 2) / 5
  const fretH = (h - top - 8) / FRETS
  // Left-handed players see the neck mirrored: low E on the right
  const x = (s) => left + (lefty ? 5 - s : s) * gap
  const y = (f) => top + f * fretH

  return (
    <svg className={`diagram ${className}`} viewBox={`0 0 ${w} ${h}`} {...(decorative ? { 'aria-hidden': true, focusable: 'false' } : { role: 'img', 'aria-label': describe(name, shape) })}>
      {base === 1 ? (
        <rect x={left - 1} y={top - 4} width={5 * gap + 2} height={4} className="diagram__nut" />
      ) : (
        <text x={left - 3} y={y(0.5) + 3} className="diagram__base" textAnchor="end">{base}</text>
      )}
      {Array.from({ length: FRETS + 1 }, (_, f) => (
        <line key={`f${f}`} x1={left} x2={left + 5 * gap} y1={y(f)} y2={y(f)} className="diagram__fret" />
      ))}
      {Array.from({ length: 6 }, (_, s) => (
        <line key={`s${s}`} x1={x(s)} x2={x(s)} y1={y(0)} y2={y(FRETS)} className="diagram__string" />
      ))}
      {shape.frets.map((fret, s) => {
        if (fret === -1) {
          return <text key={s} x={x(s)} y={top - 9} className="diagram__mute">×</text>
        }
        if (fret === 0) {
          return <circle key={s} cx={x(s)} cy={top - 12} r={3.6} className="diagram__open" />
        }
        const cy = y(fret - base + 0.5)
        return (
          <g key={s}>
            <circle cx={x(s)} cy={cy} r={6.2} className="diagram__dot" />
            {shape.fingers[s] > 0 && (
              <text x={x(s)} y={cy + 3.2} className="diagram__finger">{shape.fingers[s]}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

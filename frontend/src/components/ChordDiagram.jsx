import { chords } from '../data/chords.js'

const FRETS = 5

export default function ChordDiagram({ name, className = '' }) {
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
  const x = (s) => left + s * gap
  const y = (f) => top + f * fretH

  return (
    <svg className={`diagram ${className}`} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${name} chord`}>
      {base === 1 ? (
        <rect x={x(0) - 1} y={top - 4} width={x(5) - x(0) + 2} height={4} className="diagram__nut" />
      ) : (
        <text x={x(0) - 3} y={y(0.5) + 3} className="diagram__base" textAnchor="end">{base}</text>
      )}
      {Array.from({ length: FRETS + 1 }, (_, f) => (
        <line key={`f${f}`} x1={x(0)} x2={x(5)} y1={y(f)} y2={y(f)} className="diagram__fret" />
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

// Each song's "cover": a guitar pick in its own colours with the song's emoji.
// The colours come from the song id, so a song always looks the same.
const PALETTES = [
  ['#2f8cf0', '#1458a8'], // blue
  ['#7b61ff', '#4a2fc2'], // violet
  ['#ff6b6b', '#c23a53'], // coral
  ['#ff9f43', '#d4600f'], // orange
  ['#1fb5a5', '#0f7a74'], // teal
  ['#e85d9e', '#a8306b'], // pink
  ['#4bb543', '#2b7a25'], // green
  ['#3a3f58', '#1d2033'], // ink
]

function hash(text) {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0
  return h
}

export default function SongCover({ song, size = 56 }) {
  const [from, to] = PALETTES[hash(song.id) % PALETTES.length]
  const id = `cover-${song.id}`
  return (
    <svg
      className="song-cover"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      style={{ viewTransitionName: `cover-${song.id}` }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      {/* A standard pick: a rounded triangle with a soft, rounded tip */}
      <path
        d="M50 5C77 5 95 14 95 31C95 50 72 79 60 92C55 98 45 98 40 92C28 79 5 50 5 31C5 14 23 5 50 5Z"
        fill={`url(#${id})`}
      />
      <path d="M24 16C33 11 42 10 50 10" stroke="rgba(255,255,255,0.4)" strokeWidth="5" fill="none" strokeLinecap="round" />
      <text x="50" y="44" textAnchor="middle" dominantBaseline="central" className="song-cover__emoji">{song.emoji || '🎸'}</text>
    </svg>
  )
}

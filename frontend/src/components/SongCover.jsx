// Each song's "cover": a guitar pick in its own colours with the song's initials.
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

const initials = (title) =>
  title
    .replace(/[^A-Za-z0-9 ]/g, '')
    .split(/\s+/)
    .filter((w) => !/^(the|a|an|of|on|in)$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || title[0]

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
      {/* A plectrum: wide rounded top, tapering to a soft point */}
      <path
        d="M50 97C38 85 8 58 6 34 4 16 24 4 50 4s46 12 44 30C92 58 62 85 50 97z"
        fill={`url(#${id})`}
      />
      <path d="M50 10c-18 0-34 8-37 20" stroke="rgba(255,255,255,0.35)" strokeWidth="5" fill="none" strokeLinecap="round" />
      <text x="50" y="52" textAnchor="middle" dominantBaseline="middle" className="song-cover__text">{initials(song.title)}</text>
    </svg>
  )
}

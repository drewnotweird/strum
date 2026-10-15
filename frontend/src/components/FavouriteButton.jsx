import { toggleFavourite, useStore } from '../lib/store.js'

// A heart: tap to keep a song in Favourites (on the home page and as a Songs filter)
export default function FavouriteButton({ song, className = '' }) {
  const on = useStore((st) => st.favourites.includes(song.id))
  return (
    <button
      type="button"
      className={`fav ${on ? 'is-on' : ''} ${className}`}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleFavourite(song.id)
      }}
      aria-pressed={on}
      aria-label={on ? `Remove ${song.title} from favourites` : `Add ${song.title} to favourites`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.6 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
      </svg>
    </button>
  )
}

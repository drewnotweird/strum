import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { chordLabel } from '../data/chords.js'
import { CHORD_GROUPS, chordTitle } from '../data/chordGroups.js'
import { SongPlayer } from './Player.jsx'

// Chord change trainer: switch between two chords against the click, over and over.
// It's a tiny generated song, so it gets the whole player: guitar, loop, speed trainer.
function trainerSong(a, b, beats) {
  return {
    id: `changes-${a}-${b}-${beats}`,
    title: `${chordLabel(a)} ↔ ${chordLabel(b)}`,
    // What a screen reader and the browser tab say instead of the arrow
    spokenTitle: `${chordLabel(a)} to ${chordLabel(b)}`,
    pageTitle: 'Chord changes',
    artist: 'Chord change trainer',
    checked: true,
    capo: 0,
    bpm: 80,
    beatsPerBar: 4,
    perBeat: 2,
    patterns: { bar: 'D - D - D - D -', half: 'D - D -' },
    defaultPattern: beats === 4 ? 'bar' : 'half',
    sections: { changes: { name: 'Changes', repeat: 4, steps: [a, b] } },
    form: ['changes'],
    notes:
      'Change on the first beat, even if the new chord isn\'t perfect yet: keeping time matters more. ' +
      'Turn on "Speed up each loop" and it gets a little faster every eight changes.',
  }
}

export function ChordSelect({ label, value, onChange }) {
  return (
    <label className="picker">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {CHORD_GROUPS.map((group) => (
          <optgroup key={group.name} label={group.name}>
            {group.chords.map((c) => <option key={c} value={c}>{chordTitle(c)}</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  )
}

export default function Trainer() {
  const [params, setParams] = useSearchParams()
  const a = params.get('a') || 'C'
  const b = params.get('b') || 'G'
  const beats = params.get('beats') === '2' ? 2 : 4
  const update = (patch) => setParams({ a, b, beats: String(beats), ...patch }, { replace: true })
  const song = useMemo(() => trainerSong(a, b, beats), [a, b, beats])

  const extra = (
    <div className="trainer-setup">
      <ChordSelect label="Change from" value={a} onChange={(v) => update({ a: v })} />
      <ChordSelect label="to" value={b} onChange={(v) => update({ b: v })} />
      <div className="picker">
        <span id="beats-label">Each chord</span>
        <div className="segmented" role="group" aria-labelledby="beats-label">
          {[4, 2].map((n) => (
            <button
              key={n}
              type="button"
              className={beats === n ? 'is-on' : ''}
              aria-pressed={beats === n}
              onClick={() => update({ beats: String(n) })}
            >
              {n} beats
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <SongPlayer
      key={song.id}
      song={song}
      extra={extra}
      defaultLoop
      trackable={false}
      back={{ to: '/practice', label: 'Back to Practice' }}
    />
  )
}

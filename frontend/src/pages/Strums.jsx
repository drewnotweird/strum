import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { chords } from '../data/chords.js'
import { STRUMS, strumById } from '../data/strums.js'
import { ChordSelect } from './Trainer.jsx'
import { SongPlayer } from './Player.jsx'

// Strum trainer: one pattern on one chord, looping against the click, in the normal player.
// Like the chord change trainer, it's a tiny generated song.
function strumSong(strum, chord) {
  return {
    id: `strum-${strum.id}-${chord}`,
    title: strum.name,
    artist: 'Strum trainer',
    pageTitle: 'Strumming',
    checked: true,
    capo: 0,
    bpm: strum.beats === 3 ? 96 : 80,
    beatsPerBar: strum.beats || 4,
    perBeat: 2,
    patterns: { strum: strum.pattern },
    defaultPattern: 'strum',
    sections: { loop: { name: 'Strumming', repeat: 8, steps: [chord] } },
    form: ['loop'],
    notes: `${strum.blurb}.`,
  }
}

export default function Strums() {
  const [params, setParams] = useSearchParams()
  const strum = strumById(params.get('p')) || STRUMS[0]
  const chord = chords[params.get('c')] ? params.get('c') : 'G'
  const update = (patch) => setParams({ p: strum.id, c: chord, ...patch }, { replace: true })
  const song = useMemo(() => strumSong(strum, chord), [strum, chord])

  const extra = (
    <div className="trainer-setup trainer-setup--strums">
      <label className="picker">
        <span>Pattern</span>
        <select value={strum.id} onChange={(e) => update({ p: e.target.value })}>
          {STRUMS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <ChordSelect label="Chord" value={chord} onChange={(v) => update({ c: v })} />
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

import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { chordLabel } from '../data/chords.js'
import { strumFor } from '../data/strums.js'
import { trickiestChange } from '../lib/changes.js'
import { SKILLS, songSkills } from '../lib/skills.js'
import { getState } from '../lib/store.js'
import { goLink } from '../lib/transition.js'

// Before he starts: the techniques in the song, the chords he hasn't played yet, the change
// most likely to trip him up and the strum it uses, each with a way to practise it alone
export default function GetReady({ song, steps }) {
  const navigate = useNavigate()
  // What he'd played before opening the song, so the list doesn't shrink as he plays
  const [playedBefore] = useState(() => new Set(getState().playedChords))

  const { skills, fresh, tricky, strums } = useMemo(() => {
    const strums = []
    steps.forEach((step) => {
      const strum = strumFor(step.pattern.join(' '))
      if (strum && !strums.some((s) => s.strum.id === strum.id)) strums.push({ strum, chord: step.chord })
    })
    return {
      skills: songSkills(song),
      fresh: [...new Set(steps.map((s) => chordLabel(s.chord)))].filter((c) => !playedBefore.has(c)),
      tricky: trickiestChange(steps),
      strums,
    }
  }, [song, steps, playedBefore])

  if (!skills.length && !fresh.length && !tricky && !strums.length) return null

  const practise = (to, what) => (
    <Link {...goLink(navigate, to)} className="ready__go">
      Practise it<span className="sr-only">: {what}</span>
    </Link>
  )

  return (
    <ul className="ready">
      {skills.length > 0 && (
        <li>
          <span className="ready__label">You'll practise</span>
          <span className="ready__chips">
            {skills.map((id) => <span key={id} className="skill-chip">{SKILLS[id].name}</span>)}
          </span>
        </li>
      )}
      {fresh.length > 0 && (
        <li>
          <span className="ready__label">{fresh.length === 1 ? 'New chord for you' : 'New chords for you'}</span>
          <span className="ready__chips">
            {fresh.map((c) => <span key={c} className="mini-chord">{c}</span>)}
          </span>
        </li>
      )}
      {tricky && (
        <li>
          <span className="ready__label">Trickiest change</span>
          <span className="ready__row">
            <strong>{chordLabel(tricky.from)} → {chordLabel(tricky.to)}</strong>
            {practise(
              `/changes?a=${encodeURIComponent(tricky.from)}&b=${encodeURIComponent(tricky.to)}&beats=4`,
              `${chordLabel(tricky.from)} to ${chordLabel(tricky.to)}`
            )}
          </span>
        </li>
      )}
      {strums.length > 0 && (
        <li>
          <span className="ready__label">{strums.length === 1 ? 'Strum pattern' : 'Strum patterns'}</span>
          <span className="ready__row">
            {strums.map(({ strum, chord }) => (
              <Link key={strum.id} {...goLink(navigate, `/strums?p=${strum.id}&c=${encodeURIComponent(chord)}`)} className="ready__go">
                <span className="sr-only">Practise </span>{strum.name}<span aria-hidden="true"> →</span>
              </Link>
            ))}
          </span>
        </li>
      )}
    </ul>
  )
}

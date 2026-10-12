import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getSong, buildSteps, buildTimeline } from '../lib/song.js'
import { createPlayer } from '../lib/player.js'
import { songNotes, voiceFor } from '../lib/guitar.js'
import { chords, chordLabel } from '../data/chords.js'
import ChordDiagram from '../components/ChordDiagram.jsx'
import { artistTransitionName, go, titleTransitionName } from '../lib/transition.js'
import { keepAwake } from '../lib/wakeLock.js'
import { addPractice, setLefty, toggleLearned, useStore } from '../lib/store.js'

function tokenLabel(token, chord) {
  if (token === 'D') return '↓'
  if (token === 'U') return '↑'
  if (token === '-') return '·'
  if (token === 'B') return String(chords[chord]?.root ?? 'B')
  return token
}

const isPick = (token) => token === 'B' || /^\d$/.test(token)

// What a screen reader says for a strum pattern
function describePattern(pattern, chord) {
  const words = pattern.map((t) => {
    if (t === 'D') return 'down'
    if (t === 'U') return 'up'
    if (t === '-') return 'rest'
    return `string ${tokenLabel(t, chord)}`
  })
  return `${pattern.some(isPick) ? 'Picking' : 'Strum'} pattern: ${words.join(', ')}`
}

export default function Player() {
  const { id } = useParams()
  const song = getSong(id)
  if (!song) {
    return (
      <main className="missing">
        <p>Can't find that song.</p>
        <Link to="/">Back to the songs</Link>
      </main>
    )
  }
  return <SongPlayer key={song.id} song={song} />
}

// The play-along screen. Also used by the chord change trainer, which passes its own
// generated song, an `extra` panel under the header, and starts with looping on.
export function SongPlayer({ song, extra = null, defaultLoop = false, trackable = true }) {
  const navigate = useNavigate()
  const { steps, sectionStarts } = useMemo(() => buildSteps(song), [song])
  const { timeline, stepStart } = useMemo(() => buildTimeline(steps), [steps])

  const [stepIndex, setStepIndex] = useState(0)
  const [countIn, setCountIn] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [ended, setEnded] = useState(false)
  const [speed, setSpeed] = useState(0.7)
  const [clickOn, setClickOn] = useState(true)
  const [guitarOn, setGuitarOn] = useState(true)
  const [announcement, setAnnouncement] = useState('')
  const [loopOn, setLoopOn] = useState(defaultLoop)
  const [rampOn, setRampOn] = useState(false)
  const lefty = useStore((st) => st.lefty)
  const learned = useStore((st) => st.learned.includes(song.id))

  const playerRef = useRef(null)
  const strumRef = useRef(null)
  const stepRef = useRef(0)
  const slotRef = useRef(-1)
  const nowRef = useRef(null)
  const nextRef = useRef(null)
  const flyRef = useRef(null)

  // Before the chord changes, note where the NEXT chord sits and copy the outgoing NOW
  // chord, so the layout effect below can animate between the two
  const prepareFly = () => {
    const next = nextRef.current
    const now = nowRef.current
    if (!next || !now || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const rect = (sel) => next.querySelector(sel)?.getBoundingClientRect()
    flyRef.current = {
      name: rect('.chord-name--next'),
      diagram: rect('.diagram--next'),
      leaving: ['.chord-name--now', '.diagram--now', '.strum']
        .map((sel) => now.querySelector(sel))
        .filter(Boolean)
        .map((el) => ({ rect: el.getBoundingClientRect(), el: el.cloneNode(true) })),
    }
  }

  const paintSlot = () => {
    const row = strumRef.current
    if (!row) return
    Array.from(row.children).forEach((el, k) => {
      el.classList.toggle('is-on', k === slotRef.current)
      el.classList.toggle('is-done', k < slotRef.current)
    })
  }

  useLayoutEffect(paintSlot, [stepIndex, countIn])

  // Shared-element move: the NEXT chord name and diagram travel to their NOW spots
  // (true size, no stretching), the old NOW chord fades away, the rest eases in.
  useLayoutEffect(() => {
    const fly = flyRef.current
    flyRef.current = null
    const now = nowRef.current
    if (!fly || !now) return

    const ease = 'cubic-bezier(0.3, 1.2, 0.45, 1)'
    const duration = 380

    // Old NOW content: pinned copies that shrink and fade where they stood
    fly.leaving.forEach(({ rect, el }) => {
      Object.assign(el.style, {
        position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`,
        width: `${rect.width}px`, height: `${rect.height}px`, margin: '0',
        zIndex: '40', pointerEvents: 'none', transformOrigin: 'center',
      })
      document.body.appendChild(el)
      el.animate(
        [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.9)' }],
        { duration: 160, easing: 'ease-in', fill: 'forwards' }
      ).onfinish = () => el.remove()
    })

    // Lift NOW above NEXT while its chord travels in from there
    now.style.zIndex = '2'
    now.style.overflow = 'visible'
    const pairs = [
      [fly.name, now.querySelector('.chord-name--now'), 'height'],
      [fly.diagram, now.querySelector('.diagram--now'), 'width'],
    ]
    const moves = pairs.map(([from, el, axis]) => {
      if (!from || !el) return null
      const to = el.getBoundingClientRect()
      const scale = from[axis] / to[axis]
      el.style.transformOrigin = 'top left'
      return el.animate(
        [
          { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${scale})` },
          { transform: 'none' },
        ],
        { duration, easing: ease }
      ).finished
    })
    Promise.all(moves).then(() => {
      now.style.zIndex = ''
      now.style.overflow = ''
    }).catch(() => {})

    now.querySelector('.strum')?.animate(
      [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
      { duration: 260, delay: 140, easing: 'ease-out', fill: 'backwards' }
    )
    now.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.012)', offset: 0.7 }, { transform: 'scale(1)' }],
      { duration: duration + 80, easing: 'ease-out' }
    )
    Array.from(nextRef.current?.children || []).forEach((el, i) => el.animate(
      [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
      { duration: 280, delay: 170 + i * 40, easing: ease, fill: 'backwards' }
    ))
  }, [stepIndex])

  useEffect(() => {
    const player = createPlayer({
      length: timeline.length,
      slotsPerBeat: song.perBeat,
      slotsPerBar: song.perBeat * song.beatsPerBar,
      bpm: song.bpm,
      notes: songNotes([...new Set(steps.map((st) => st.chord))], song.capo),
      voiceAt: (i) => {
        const { step, slot } = timeline[i]
        return voiceFor(steps[step].chord, steps[step].pattern[slot], song.capo)
      },
      onSlot: (i, beatsLeft) => {
        if (beatsLeft > 0) {
          slotRef.current = -1
          setCountIn(beatsLeft)
          return
        }
        setCountIn(0)
        const { step, slot } = timeline[i]
        slotRef.current = slot
        if (step !== stepRef.current) {
          if (step === stepRef.current + 1) prepareFly()
          stepRef.current = step
          setStepIndex(step)
        } else {
          paintSlot()
        }
      },
      onEnd: () => {
        slotRef.current = -1
        setPlaying(false)
        setEnded(true)
      },
      // The speed trainer nudges the tempo up each time round the loop
      onSpeed: (s) => setSpeed(s),
    })
    player.setSpeed(speed)
    player.setClick(clickOn)
    player.setGuitar(guitarOn)
    playerRef.current = player
    return () => player.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, song])

  const announce = (s) => {
    const after = steps[s + 1]
    setAnnouncement(`Now ${chordLabel(steps[s].chord)}${after ? `, next ${chordLabel(after.chord)}` : ', last chord'}`)
  }

  const goTo = (step) => {
    const s = Math.max(0, Math.min(steps.length - 1, step))
    if (!playerRef.current.isPlaying()) announce(s)
    setEnded(false)
    if (s === stepRef.current + 1 && !ended) prepareFly()
    stepRef.current = s
    setStepIndex(s)
    if (playerRef.current.isPlaying()) {
      slotRef.current = -1
      playerRef.current.seek(stepStart[s])
    } else {
      slotRef.current = -1
      paintSlot()
    }
  }

  const play = () => {
    const from = ended ? 0 : stepRef.current
    setEnded(false)
    stepRef.current = from
    setStepIndex(from)
    slotRef.current = -1
    playerRef.current.start(stepStart[from])
    setPlaying(true)
    setAnnouncement('Playing')
  }

  const stop = () => {
    playerRef.current.stop()
    slotRef.current = -1
    setCountIn(0)
    setPlaying(false)
    paintSlot()
    announce(stepRef.current)
  }

  const toggle = () => (playerRef.current.isPlaying() ? stop() : play())

  const changeSpeed = (s) => {
    setSpeed(s)
    playerRef.current.setSpeed(s)
  }

  const toggleGuitar = () => {
    setGuitarOn((on) => {
      playerRef.current.setGuitar(!on)
      return !on
    })
  }

  const toggleClick = () => {
    setClickOn((on) => {
      playerRef.current.setClick(!on)
      return !on
    })
  }

  // Latest handlers for the keyboard listener without re-binding it every render
  const keys = useRef({})
  keys.current = { toggle, back: () => goTo(stepRef.current - 1), fwd: () => goTo(stepRef.current + 1) }
  const keyRefs = { Space: useRef(null), ArrowLeft: useRef(null), ArrowRight: useRef(null) }
  useEffect(() => {
    const actions = { Space: 'toggle', ArrowLeft: 'back', ArrowRight: 'fwd' }
    // Physical keys press the on-screen keys too
    const press = (code, down) => keyRefs[code]?.current?.classList.toggle('is-pressed', down)
    const onDown = (e) => {
      const el = e.target instanceof Element ? e.target : document.body
      if (!actions[e.code] || el.closest('input, select, textarea')) return
      const onOtherControl = el.closest('button, a, [role="button"]') && !Object.values(keyRefs).some((r) => r.current === el)
      if (e.code === 'Space' && onOtherControl) return
      e.preventDefault()
      press(e.code, true)
      if (!e.repeat) keys.current[actions[e.code]]()
    }
    const onUp = (e) => press(e.code, false)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.title = `${song.title} · Strum`
    return () => { document.title = 'Strum' }
  }, [song])

  const now = steps[stepIndex]
  const next = steps[stepIndex + 1]
  const picking = now.pattern.some(isPick)
  const currentSection = sectionStarts.findLastIndex((s) => s.step <= stepIndex)

  // Looping repeats whichever section you're in. Moving to another section loops that one.
  useEffect(() => {
    if (!loopOn) {
      playerRef.current.setLoop(null)
      return
    }
    const after = sectionStarts[currentSection + 1]
    playerRef.current.setLoop({
      start: stepStart[sectionStarts[currentSection].step],
      end: after ? stepStart[after.step] : timeline.length,
    })
  }, [loopOn, currentSection, sectionStarts, stepStart, timeline])

  useEffect(() => {
    playerRef.current.setRampUp(loopOn && rampOn)
  }, [loopOn, rampOn])

  // While playing: keep the screen on, and count the time towards today's practice
  useEffect(() => {
    if (!playing) return
    keepAwake(true)
    const started = Date.now()
    return () => {
      keepAwake(false)
      if (trackable) addPractice((Date.now() - started) / 1000)
    }
  }, [playing, trackable])

  const learnedButton = trackable && (
    <button
      className={`btn btn--learned ${learned ? 'is-on' : ''}`}
      onClick={() => toggleLearned(song.id)}
      aria-pressed={learned}
    >
      {learned ? '✓ I can play this' : 'I can play this!'}
    </button>
  )

  return (
    <main className="player">
      <p className="sr-only" aria-live="polite">{announcement}</p>
      <header className="player__head">
        <Link
          to="/"
          className="back"
          aria-label="All songs"
          onClick={(e) => {
            e.preventDefault()
            go(navigate, '/', 'back')
          }}
        >
          ←
        </Link>
        <div className="player__title">
          <h1 style={titleTransitionName(song.id)}>{song.title}</h1>
          <p>
            <span style={artistTransitionName(song.id)}>{song.artist}</span>
            {song.kind === 'drill' ? ' · warm-up drill' : ''}
          </p>
        </div>
        {song.capo > 0 && <span className="badge">Capo {song.capo}</span>}
      </header>

      {extra}

      <section className="stage">
        <div ref={nowRef} className={`now ${ended ? 'is-ended' : ''}`}>
          <span className="stage__label">{ended ? 'Finished' : `Now · ${now.section}`}</span>
          {ended ? (
            <div className="now__done">
              <p>Nice one.</p>
              <button className="btn btn--primary" onClick={play}>Play again</button>
              {learnedButton}
            </div>
          ) : (
            <>
              <span className="chord-name chord-name--now">{chordLabel(now.chord)}</span>
              <button
                className="diagram-button"
                onClick={() => playerRef.current.preview(voiceFor(now.chord, 'D', song.capo))}
                aria-label={`Hear ${chordLabel(now.chord)}`}
              >
                <ChordDiagram name={now.chord} className="diagram--now" />
              </button>
              <div className="strum-wrap">
                {countIn > 0 && <div className="count">{countIn}</div>}
                <div
                  ref={strumRef}
                  className={`strum ${picking ? 'strum--pick' : ''} ${countIn > 0 ? 'is-hidden' : ''}`}
                  role="img"
                  aria-label={describePattern(now.pattern, now.chord)}
                >
                  {now.pattern.map((token, k) => (
                    <span key={k} className={`strum__slot ${token === '-' ? 'is-rest' : ''}`} aria-hidden="true">
                      {tokenLabel(token, now.chord)}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div
          ref={nextRef}
          className={`next ${next && !ended ? 'is-tappable' : ''}`}
          onClick={next && !ended ? () => goTo(stepIndex + 1) : undefined}
          role={next && !ended ? 'button' : undefined}
          tabIndex={next && !ended ? 0 : undefined}
          onKeyDown={next && !ended ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
              goTo(stepIndex + 1)
            }
          } : undefined}
          aria-label={next && !ended ? `Move ${chordLabel(next.chord)} up to now` : undefined}
        >
          <span className="stage__label">Next{next && next.section !== now.section ? ` · ${next.section}` : ''}</span>
          {next && !ended ? (
            <>
              <span className="chord-name chord-name--next">{chordLabel(next.chord)}</span>
              <ChordDiagram name={next.chord} className="diagram--next" />
            </>
          ) : (
            <span className="chord-name chord-name--next is-end">End</span>
          )}
        </div>
      </section>

      <div className="controls">
        <button
          ref={keyRefs.ArrowLeft}
          className="key key--arrow"
          onClick={() => goTo(stepIndex - 1)}
          aria-label="Previous chord"
          disabled={stepIndex === 0}
        >
          ←
        </button>
        <button
          ref={keyRefs.Space}
          className={`key key--space ${playing ? 'is-playing' : ''}`}
          onClick={toggle}
          aria-label={playing ? 'Stop' : 'Play'}
        >
          {playing ? (
            <svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z" /></svg>
          )}
          <span>{playing ? 'Stop' : 'Play'}</span>
        </button>
        <button
          ref={keyRefs.ArrowRight}
          className="key key--arrow"
          onClick={() => goTo(stepIndex + 1)}
          aria-label="Next chord"
          disabled={stepIndex === steps.length - 1}
        >
          →
        </button>
      </div>

      <div className="settings">
        <label className="speed">
          <span>Speed {Math.round(speed * 100)}%</span>
          <input
            type="range" min="0.4" max="1" step="0.05" value={speed}
            onChange={(e) => changeSpeed(Number(e.target.value))}
          />
        </label>
        <div className="toggles">
          <button className={`btn btn--toggle ${guitarOn ? 'is-on' : ''}`} onClick={toggleGuitar} aria-pressed={guitarOn}>
            Guitar {guitarOn ? 'on' : 'off'}
          </button>
          <button className={`btn btn--toggle ${clickOn ? 'is-on' : ''}`} onClick={toggleClick} aria-pressed={clickOn}>
            Click {clickOn ? 'on' : 'off'}
          </button>
          <button className={`btn btn--toggle ${loopOn ? 'is-on' : ''}`} onClick={() => setLoopOn((on) => !on)} aria-pressed={loopOn}>
            Loop section
          </button>
          <button
            className={`btn btn--toggle ${loopOn && rampOn ? 'is-on' : ''}`}
            onClick={() => setRampOn((on) => !on)}
            aria-pressed={loopOn && rampOn}
            disabled={!loopOn}
            title="Each time round the loop, 5% faster, up to full speed"
          >
            Speed up each loop
          </button>
          <button className={`btn btn--toggle ${lefty ? 'is-on' : ''}`} onClick={() => setLefty(!lefty)} aria-pressed={lefty}>
            Left-handed
          </button>
        </div>
      </div>

      <nav className="sections" aria-label="Jump to section">
        {sectionStarts.map((s, i) => (
          <button
            key={i}
            className={`chip ${i === currentSection ? 'is-current' : ''}`}
            aria-current={i === currentSection ? 'step' : undefined}
            onClick={() => goTo(s.step)}
          >
            {s.name}
          </button>
        ))}
      </nav>

      <footer className="player__foot">
        {learnedButton}
        {picking && <p className="hint">Numbers are strings to pick. 1 is the thinnest, 6 the thickest.</p>}
        {song.notes && <p>{song.notes}</p>}
        {!song.checked && <p className="hint">Not checked against the record yet. If something sounds off, trust your ears.</p>}
        {song.songsterr && (
          <a href={song.songsterr} target="_blank" rel="noreferrer" className="songsterr">
            {song.kind === 'drill' ? 'Learn the real riff on Songsterr' : 'Full tab on Songsterr'} ↗
          </a>
        )}
      </footer>
    </main>
  )
}

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getSong, buildSteps, buildTimeline } from '../lib/song.js'
import { createPlayer } from '../lib/player.js'
import { songNotes, voiceFor } from '../lib/guitar.js'
import { chordLabel, chords } from '../data/chords.js'
import ChordDiagram from '../components/ChordDiagram.jsx'
import SettingsPanel from '../components/SettingsPanel.jsx'
import SongCover from '../components/SongCover.jsx'
import { confetti } from '../lib/confetti.js'
import { go, travels } from '../lib/transition.js'
import { describePattern, glyph, isPick, slotKind } from '../lib/strum.js'
import { keepAwake } from '../lib/wakeLock.js'
import { listenToMicrophone } from '../lib/listen.js'
import { addPlayedChord, addPractice, addSkillsPlayed, getState, setBeat, setEasyChords, setLastPlayed, setLefty, setSongSpeed, toggleLearned, useStore } from '../lib/store.js'
import { stepSkills } from '../lib/skills.js'
import GetReady from '../components/GetReady.jsx'
import { melodySong, whereIs } from '../lib/melody.js'
import FavouriteButton from '../components/FavouriteButton.jsx'


// Feedback goes by email: the same address as on the drewnotweird.co.uk contact page
const mailto = (subject, body) =>
  `mailto:drewnotweird@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

const LEVELS = { 1: 'Easy', 2: 'Medium', 3: 'Tricky' }



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
  return <SongOrMelody key={song.id} song={song} />
}

// Out-of-copyright songs can also be played as a melody, one note at a time (?mode=melody)
function SongOrMelody({ song }) {
  const [params, setParams] = useSearchParams()
  const melody = Boolean(song.melody) && params.get('mode') === 'melody'
  const shown = useMemo(() => (melody ? melodySong(song) : song), [song, melody])
  const pick = (m) => setParams(m ? { mode: 'melody' } : {}, { replace: true })
  const toggle = song.melody && (
    <div className="segmented mode-switch" role="group" aria-label="What to play">
      <button type="button" className={melody ? '' : 'is-on'} aria-pressed={!melody} onClick={() => pick(false)}>Chords</button>
      <button type="button" className={melody ? 'is-on' : ''} aria-pressed={melody} onClick={() => pick(true)}>Melody</button>
    </div>
  )
  return <SongPlayer key={melody ? 'melody' : 'chords'} song={shown} extra={toggle} melody={melody} />
}

// The play-along screen. Also used by the chord change trainer, which passes its own
// generated song, an `extra` panel under the header, and starts with looping on.
// `back`: where the back arrow goes. Songs return home; tools (the chord trainer) return to
// Practice and sit like the other tool pages.
const HOME = { to: '/', label: 'All songs' }
// `melody`: the song is its tune, one note per step (see lib/melody.js)
export function SongPlayer({ song, extra = null, defaultLoop = false, trackable = true, back = HOME, melody = false }) {
  const speedKey = melody ? `${song.id}:melody` : song.id
  const navigate = useNavigate()
  const easy = useStore((st) => st.easyChords)
  const beat = useStore((st) => st.beat)
  const { steps, sectionStarts } = useMemo(() => buildSteps(song, { easy }), [song, easy])
  const { timeline, stepStart } = useMemo(() => buildTimeline(steps), [steps])
  // Where each chord's last strum falls: that's when the next chord moves up into NOW,
  // giving a moment's warning to change shape
  // A melody note is held to the end of its pattern, so it stays in NOW until then
  const lastStrum = useMemo(
    () => steps.map((st) => (melody ? st.pattern.length - 1 : st.pattern.reduce((last, token, k) => (token === '-' ? last : k), 0))),
    [steps, melody]
  )
  // The techniques each step uses, recorded for Progress as he plays them
  const stepSkillList = useMemo(() => steps.map((st) => stepSkills(st.chord, st.pattern)), [steps])
  // The chord that follows step s, wrapping round when a section is looping
  const loopRef = useRef(null)
  const followingStep = (s) => {
    const loop = loopRef.current
    if (loop && s === loop.last) return loop.first
    return s + 1 < steps.length ? s + 1 : null
  }

  // "Keep going" on the home page opens a song part-way through with ?from=<step>
  const [params] = useSearchParams()
  const startStep = Math.max(0, Math.min(steps.length - 1, Number(params.get('from')) || 0))
  const [stepIndex, setStepIndex] = useState(startStep)
  const [countIn, setCountIn] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [ended, setEnded] = useState(false)
  // Each song opens at the speed he last played it at
  const [speed, setSpeed] = useState(() => (trackable && getState().speeds[speedKey]) || 0.7)
  // "Hear this section": plays the section once with the guitar, then stops
  const [previewing, setPreviewing] = useState(false)
  const previewRef = useRef(null)
  const guitarOnRef = useRef(true)
  const currentSectionRef = useRef(0)
  const [guitarOn, setGuitarOn] = useState(true)
  const [announcement, setAnnouncement] = useState('')
  const [loopOn, setLoopOn] = useState(defaultLoop)
  const [rampOn, setRampOn] = useState(false)
  // Listen mode: the microphone moves things on, one strum at a time, instead of the clock
  const [listenMode, setListenMode] = useState(false)
  const [listening, setListening] = useState(false)
  const [sensitivity, setSensitivity] = useState('medium')
  const [micError, setMicError] = useState('')
  const listenerRef = useRef(null)
  const heardRef = useRef(null)
  const lefty = useStore((st) => st.lefty)
  const learned = useStore((st) => st.learned.includes(song.id))

  const playerRef = useRef(null)
  const strumRef = useRef(null)
  const stepRef = useRef(startStep)
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

  // The chord timer under the strums fills up towards the chord's last strum, which is
  // when the next chord arrives. Driven directly on the DOM, like the strum lights.
  const timerRef = useRef(null)
  const slotMsRef = useRef(0)
  const paintTimer = () => {
    const bar = timerRef.current
    if (!bar) return
    const slot = slotRef.current
    if (slot < 0) {
      bar.style.transition = 'none'
      bar.style.transform = 'scaleX(0)'
      return
    }
    const last = lastStrum[stepRef.current] ?? 0
    const share = Math.min(1, (slot + 1) / (last + 1))
    bar.style.transition = `transform ${Math.round(slotMsRef.current)}ms linear`
    bar.style.transform = `scaleX(${share})`
  }

  const paintSlot = () => {
    const row = strumRef.current
    if (!row) return
    Array.from(row.children).forEach((el, k) => {
      el.classList.toggle('is-on', k === slotRef.current)
      el.classList.toggle('is-done', k < slotRef.current)
    })
    paintTimer()
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
        return voiceFor(steps[step].chord, steps[step].pattern[slot], song.capo, steps[step].feel)
      },
      onSlot: (i, beatsLeft) => {
        if (beatsLeft > 0) {
          slotRef.current = -1
          setCountIn(beatsLeft)
          return
        }
        setCountIn(0)
        const { step, slot } = timeline[i]
        if (step !== stepRef.current && followingStep(step) === stepRef.current) {
          // Rests at the end of a chord that has already moved on: nothing to show
          return
        }
        slotRef.current = slot
        if (!previewRef.current && steps[step].pattern[slot] !== '-') {
          if (!melody) addPlayedChord(chordLabel(steps[step].chord))
          addSkillsPlayed(stepSkillList[step])
        }
        if (step !== stepRef.current) {
          // A jump: the first slot after a seek or a restart
          stepRef.current = step
          setStepIndex(step)
        } else {
          paintSlot()
        }
        // On the last strum of NOW, bring the next chord up
        if (slot === lastStrum[step]) {
          const next = followingStep(step)
          if (next !== null) {
            prepareFly()
            stepRef.current = next
            slotRef.current = -1
            setStepIndex(next)
          }
        }
      },
      onEnd: () => {
        slotRef.current = -1
        setPlaying(false)
        setEnded(true)
        const r = nowRef.current?.getBoundingClientRect()
        confetti(r ? { x: r.left + r.width / 2, y: r.top + r.height / 3 } : undefined)
      },
      // The speed trainer nudges the tempo up each time round the loop
      onSpeed: (s) => {
        setSpeed(s)
        if (trackable) setSongSpeed(speedKey, s)
      },
      // A section preview finished: back to the start of that section, guitar as it was
      onStopAt: () => {
        const from = previewRef.current
        previewRef.current = null
        setPreviewing(false)
        setPlaying(false)
        player.setGuitar(guitarOnRef.current)
        stepRef.current = from
        slotRef.current = -1
        setStepIndex(from)
        paintSlot()
      },
    })
    player.setSpeed(speed)
    player.setBeat(beat)
    player.setGuitar(guitarOn)
    playerRef.current = player
    return () => player.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, song])

  const announce = (s) => {
    const after = steps[s + 1]
    const cue = steps[s].cue ? `. ${steps[s].cue}` : ''
    setAnnouncement(`Now ${chordLabel(steps[s].chord)}${after ? `, next ${chordLabel(after.chord)}` : ', last chord'}${cue}`)
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
    if (previewRef.current !== null) {
      previewRef.current = null
      setPreviewing(false)
      playerRef.current.setGuitar(guitarOnRef.current)
    }
    slotRef.current = -1
    setCountIn(0)
    setPlaying(false)
    paintSlot()
    announce(stepRef.current)
  }

  // A strum was heard: light the next strum in NOW (rests are skipped), and on its last
  // strum bring the next chord up, exactly as when playing along to the clock
  const onHeard = () => {
    const step = stepRef.current
    const pattern = steps[step].pattern
    let k = slotRef.current + 1
    while (k < pattern.length && pattern[k] === '-') k++
    if (k >= pattern.length) return
    slotRef.current = k
    paintSlot()
    if (!melody) addPlayedChord(chordLabel(steps[step].chord))
    addSkillsPlayed(stepSkillList[step])
    const dot = heardRef.current
    if (dot) {
      dot.classList.remove('is-heard')
      void dot.offsetWidth // restart the flash
      dot.classList.add('is-heard')
    }
    if (k === lastStrum[step] || melody) {
      const next = followingStep(step)
      if (next === null) {
        stopListening()
        setEnded(true)
        return
      }
      prepareFly()
      stepRef.current = next
      slotRef.current = -1
      setStepIndex(next)
    }
  }
  const onHeardRef = useRef(onHeard)
  onHeardRef.current = onHeard

  const startListening = async () => {
    if (playerRef.current.isPlaying()) stop()
    setMicError('')
    if (ended) {
      setEnded(false)
      stepRef.current = 0
      setStepIndex(0)
    }
    slotRef.current = -1
    paintSlot()
    try {
      listenerRef.current = await listenToMicrophone({ onStrum: () => onHeardRef.current(), sensitivity })
      setListening(true)
      setAnnouncement('Listening. Start strumming.')
    } catch {
      setMicError('Strum needs the microphone to hear you play. Allow it in your browser settings, then try again.')
    }
  }

  function stopListening() {
    listenerRef.current?.stop()
    listenerRef.current = null
    setListening(false)
  }

  useEffect(() => () => listenerRef.current?.stop(), [])
  useEffect(() => { listenerRef.current?.setSensitivity(sensitivity) }, [sensitivity])

  const toggle = () => {
    if (listenMode) return listening ? stopListening() : startListening()
    return playerRef.current.isPlaying() ? stop() : play()
  }

  const toggleListenMode = () => {
    if (listenMode) stopListening()
    else if (playerRef.current.isPlaying()) stop()
    setListenMode(!listenMode)
  }

  slotMsRef.current = listening ? 160 : 60000 / (song.bpm * speed) / song.perBeat

  const changeSpeed = (s) => {
    setSpeed(s)
    playerRef.current.setSpeed(s)
    if (trackable) setSongSpeed(speedKey, s)
  }

  // Finished below full speed: go again, a notch faster
  const fasterSpeed = Math.min(1, Math.round((speed + 0.05) * 100) / 100)
  const playFaster = () => {
    changeSpeed(fasterSpeed)
    play()
  }

  const setGuitar = (on) => {
    setGuitarOn(on)
    playerRef.current.setGuitar(on)
  }

  // Settings panel. While it's open the keyboard works the panel, not the song.
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsOpenRef = useRef(false)
  settingsOpenRef.current = settingsOpen
  const settingsButtonRef = useRef(null)
  const closeSettings = useCallback(() => setSettingsOpen(false), [])

  useEffect(() => { playerRef.current.setBeat(beat) }, [beat])
  useEffect(() => { guitarOnRef.current = guitarOn }, [guitarOn])

  // Play just the current section through once, guitar on, so you know how it should sound
  const hearSection = () => {
    if (listening) stopListening()
    const section = sectionStarts[currentSectionRef.current]
    const after = sectionStarts[currentSectionRef.current + 1]
    previewRef.current = section.step
    setEnded(false)
    stepRef.current = section.step
    slotRef.current = -1
    setStepIndex(section.step)
    playerRef.current.setGuitar(true)
    playerRef.current.start(stepStart[section.step], { countIn: false, until: after ? stepStart[after.step] : timeline.length })
    setPlaying(true)
    setPreviewing(true)
    setAnnouncement(`Playing the ${section.name}`)
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
      if (!actions[e.code] || settingsOpenRef.current || el.closest('input, select, textarea')) return
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
    document.title = `${song.pageTitle || song.title} · Strum`
    return () => { document.title = 'Strum' }
  }, [song])

  const now = steps[stepIndex]
  const next = steps[stepIndex + 1]
  const picking = now.pattern.some(isPick)
  const nowNote = chords[now.chord]?.note
  // For the tips: does any part of the song use picking?
  const songPicks = Object.values(song.patterns).some((p) => p.split(/\s+/).some(isPick))
  const currentSection = sectionStarts.findLastIndex((s) => s.step <= stepIndex)
  currentSectionRef.current = currentSection

  // Looping repeats whichever section you're in. Moving to another section loops that one.
  useEffect(() => {
    if (!loopOn) {
      loopRef.current = null
      playerRef.current.setLoop(null)
      return
    }
    const after = sectionStarts[currentSection + 1]
    const first = sectionStarts[currentSection].step
    const end = after ? after.step : steps.length
    loopRef.current = { first, last: end - 1 }
    playerRef.current.setLoop({
      start: stepStart[first],
      end: after ? stepStart[after.step] : timeline.length,
    })
  }, [loopOn, currentSection, sectionStarts, stepStart, timeline, steps])

  useEffect(() => {
    playerRef.current.setRampUp(loopOn && rampOn)
  }, [loopOn, rampOn])

  // While playing or listening: keep the screen on, and count the time towards today's
  // practice every few seconds (hearing a preview doesn't count)
  const active = (playing && !previewing) || listening
  useEffect(() => {
    if (!active) return
    keepAwake(true)
    let last = Date.now()
    const bank = () => {
      const now = Date.now()
      addPractice((now - last) / 1000)
      last = now
    }
    const timer = setInterval(bank, 10000)
    return () => {
      clearInterval(timer)
      keepAwake(false)
      bank()
      // Remember where he got to, for "Keep going" (a finished song starts again)
      if (trackable && !melody) {
        const step = stepRef.current >= steps.length - 1 ? 0 : stepRef.current
        setLastPlayed({ id: song.id, step, section: steps[step].section })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // The song map is one sideways-scrolling strip; keep the current section in view
  const sectionsRef = useRef(null)
  useEffect(() => {
    const chip = sectionsRef.current?.children[currentSection]
    if (!chip) return
    const strip = sectionsRef.current
    const left = chip.offsetLeft - strip.clientWidth / 2 + chip.clientWidth / 2
    strip.scrollTo({ left, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [currentSection])

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
    <main className={`player ${back !== HOME ? 'player--tool' : ''} ${(playing && !previewing) || listening ? 'is-playing' : ''}`}>
      <p className="sr-only" aria-live="polite">{announcement}</p>
      <header className="player__head">
        <div className="player__nav">
          <Link
            to={back.to}
            className="back"
            aria-label={back.label}
            onClick={(e) => {
              e.preventDefault()
              go(navigate, back.to, 'back', back === HOME ? song.id : undefined)
            }}
          >
            ←
          </Link>
          {trackable && <FavouriteButton song={song} className="player__fav" />}
        </div>
        <div className="player__title">
          <h1 {...travels('title', song.id)}>
            {song.spokenTitle ? (
              <>
                <span aria-hidden="true">{song.title}</span>
                <span className="sr-only">{song.spokenTitle}</span>
              </>
            ) : song.title}
          </h1>
          <p>
            <span {...travels('artist', song.id)}>{song.artist}</span>
            {song.kind === 'drill' ? ' · warm-up drill' : ''}
            {song.capo > 0 && <span className="badge player__capo">Capo {song.capo}</span>}
          </p>
        </div>
        <span className="player__pick">
          <SongCover song={song} size={44} />
          {LEVELS[song.level] && <span className={`level level--${song.level}`}>{LEVELS[song.level]}</span>}
        </span>
      </header>

      {extra}

      <section className="stage">
        <div ref={nowRef} className={`now ${ended ? 'is-ended' : ''}`}>
          <span className="stage__label">
            {ended ? 'Finished' : `Now · ${now.section}`}
            {listening && (
              <span className="listen-badge">
                <span ref={heardRef} className="listen-badge__dot" aria-hidden="true" />
                Listening
              </span>
            )}
            {!ended && now.cue && <span className="stage__cue">{now.cue}</span>}
          </span>
          {ended ? (
            <div className="now__done">
              <p>Nice one.</p>
              <button className="btn btn--primary" onClick={play}>Play again</button>
              {speed < 1 && !listenMode && (
                <button className="btn btn--faster" onClick={playFaster}>Again at {Math.round(fasterSpeed * 100)}%</button>
              )}
              {learnedButton}
            </div>
          ) : (
            <>
              <span className="chord-name chord-name--now" data-len={Math.min(6, chordLabel(now.chord).length)}>{chordLabel(now.chord)}</span>
              <button
                type="button"
                className="diagram-button"
                onClick={() => playerRef.current.preview(voiceFor(now.chord, 'D', song.capo))}
              >
                {/* Named by its content: "Hear" plus the diagram's description of the shape */}
                <span className="sr-only">Hear </span>
                <ChordDiagram name={now.chord} className="diagram--now" />
              </button>
              <div className="strum-wrap">
                {nowNote && <p className="note-where">{whereIs(nowNote)}</p>}
                {countIn > 0 && <div key={countIn} className="count">{countIn}</div>}
                <div
                  ref={strumRef}
                  className={`strum ${picking ? 'strum--pick' : ''} ${countIn > 0 ? 'is-hidden' : ''}`}
                  role="img"
                  aria-label={nowNote ? `Play ${chordLabel(now.chord)}: ${whereIs(nowNote)}, for ${now.pattern.length} counts` : describePattern(now.pattern, now.chord)}
                >
                  {now.pattern.map((token, k) => (
                    <span key={k} className={`strum__slot ${slotKind(token)}`} aria-hidden="true">
                      {nowNote && token !== '-' ? nowNote.fret : glyph(token, now.chord)}
                      {token === 'M' && <small className="strum__pm">PM</small>}
                    </span>
                  ))}
                </div>
                <div className="chord-timer" aria-hidden="true"><span ref={timerRef} /></div>
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
        >
          <span className="stage__label">Next{next && next.section !== now.section ? ` · ${next.section}` : ''}</span>
          {next && !ended ? (
            <>
              <span className="chord-name chord-name--next">{chordLabel(next.chord)}</span>
              {chords[next.chord]?.note && <span className="note-where note-where--next">{whereIs(chords[next.chord].note)}</span>}
              <span className="sr-only">, tap to move it up to now</span>
              <ChordDiagram name={next.chord} className="diagram--next" decorative />
            </>
          ) : (
            <span className="chord-name chord-name--next is-end">End</span>
          )}
        </div>
      </section>

      <nav ref={sectionsRef} className="sections" aria-label="Song map: jump to a section">
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
          className={`key key--space ${playing || listening ? 'is-playing' : ''}`}
          onClick={toggle}
          aria-label={listening ? 'Stop listening' : playing ? 'Stop' : listenMode ? 'Start listening' : 'Play'}
        >
          {playing || listening ? (
            <svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>
          ) : listenMode ? (
            <svg viewBox="0 0 24 24"><path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zm-6 9h2a4 4 0 0 0 8 0h2a6 6 0 0 1-5 5.9V21h-2v-3.1A6 6 0 0 1 6 12z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z" /></svg>
          )}
          <span>{playing || listening ? 'Stop' : listenMode ? 'Listen' : 'Play'}</span>
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

      <div className={`speed-row ${listenMode ? 'is-disabled' : ''}`}>
        <span className="speed-row__label" id="speed-label">
          Speed <strong>{listenMode ? '—' : `${Math.round(speed * 100)}%`}</strong>
        </span>
        <div className="speed-control">
          <button type="button" className="step" onClick={() => changeSpeed(Math.max(0.4, Math.round((speed - 0.05) * 100) / 100))} disabled={listenMode || speed <= 0.4} aria-label="Slower">−</button>
          <input
            type="range" min="0.4" max="1" step="0.05" value={speed}
            onChange={(e) => changeSpeed(Number(e.target.value))}
            disabled={listenMode}
            aria-labelledby="speed-label"
            aria-valuetext={`${Math.round(speed * 100)}%`}
          />
          <button type="button" className="step" onClick={() => changeSpeed(Math.min(1, Math.round((speed + 0.05) * 100) / 100))} disabled={listenMode || speed >= 1} aria-label="Faster">+</button>
        </div>
        {(listenMode || (loopOn && rampOn)) && (
          <span className="speed-row__note">{listenMode ? 'Listen mode follows you, not the clock' : 'Speeding up 5% each loop'}</span>
        )}
      </div>

      {micError && <p className="tool__error" role="alert">{micError}</p>}

      {/* What you reach for mid-practice; everything else is in Settings */}
      <div className="quickbar">
        <button className="quick" onClick={previewing ? stop : hearSection} disabled={listening}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            {previewing ? <path d="M6 6h12v12H6z" /> : <path d="M3 9v6h4l5 4V5L7 9zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" />}
          </svg>
          <span>{previewing ? 'Stop' : `Hear the ${sectionStarts[currentSection].name.toLowerCase()}`}</span>
        </button>
        <button className={`quick ${loopOn ? 'is-on' : ''}`} onClick={() => setLoopOn((on) => !on)} aria-pressed={loopOn}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2z" /></svg>
          <span>{loopOn ? `Looping ${sectionStarts[currentSection].name.toLowerCase()}` : 'Loop'}</span>
        </button>
        <button ref={settingsButtonRef} className="quick" onClick={() => setSettingsOpen(true)} aria-haspopup="dialog" aria-expanded={settingsOpen}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)" /></svg>
          <span>Settings</span>
        </button>
      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={closeSettings}
        s={{
          speed, setSpeed: changeSpeed,
          loopOn, rampOn, setRampOn,
          listenMode, toggleListenMode, sensitivity, setSensitivity,
          guitarOn, setGuitarOn: setGuitar,
          beat, setBeat,
          easy, setEasyChords, lefty, setLefty,
        }}
      />


      {trackable && (
        <div className="song-actions">
          <button
            type="button"
            className={`action-card action-card--learned ${learned ? 'is-on' : ''}`}
            onClick={() => toggleLearned(song.id)}
            aria-pressed={learned}
          >
            <span className="action-card__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            </span>
            <span className="action-card__text">
              <strong>{learned ? 'Learned!' : 'I can play this'}</strong>
              <span>{learned ? 'Nice work. Tap to undo' : 'Mark it learned'}</span>
            </span>
          </button>
          <Link
            to={`/song/${song.id}/sheet`}
            className="action-card"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
              e.preventDefault()
              go(navigate, `/song/${song.id}/sheet`, 'forward')
            }}
          >
            <span className="action-card__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7zM14 3v5h5M10 12h6M10 16h6" /></svg>
            </span>
            <span className="action-card__text">
              <strong>Whole song</strong>
              <span>Every chord on one page</span>
            </span>
          </Link>
        </div>
      )}

      {(song.notes || songPicks || song.songsterr || !song.checked) && (
        <section className="tips" aria-labelledby="tips-title">
          <h2 id="tips-title">Tips</h2>
          {trackable && !melody && <GetReady song={song} steps={steps} />}
          {melody && (
            <p className="tips__hint">
              The big letter is the note. Underneath it: which string, and which fret to press (0 means play it open).
              The numbers in the boxes are the fret. All in first position: one finger per fret.
            </p>
          )}
          {!melody && song.notes && <p>{song.notes}</p>}
          {!melody && songPicks && <p className="tips__hint">Numbers are strings to pick. 1 is the thinnest, 6 the thickest.</p>}
          {song.songsterr && (
            <a href={song.songsterr} target="_blank" rel="noreferrer" className="tips__link">
              {song.kind === 'drill' ? 'Learn the real riff on Songsterr' : 'Full tab on Songsterr'}
              <span aria-hidden="true"> ↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
          {!song.checked && <p className="tips__small">Not checked against the record yet. If something sounds off, trust your ears.</p>}
        </section>
      )}

      {trackable && (
        <p className="report">
          <a href={mailto(`Strum: ${song.title} chart`, `Song: ${song.title} (${song.artist})\nWhich part is wrong (e.g. the chorus)?\n\nWhat should it be?\n`)}>
            Something wrong with this chart? Tell Andrew
          </a>
        </p>
      )}
    </main>
  )
}

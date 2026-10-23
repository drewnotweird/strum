import { describe, expect, it } from 'vitest'
import { songs, buildSteps, buildTimeline, barsOf, lastStrumOf } from '../lib/song.js'
import { chords, EASY, playable } from '../data/chords.js'
import { TAGS } from '../data/collections.js'
import { TOKEN } from '../lib/strum.js'
import { chordTrack, melodyLength, melodySong, melodyTab, noteShape, parseMelody } from '../lib/melody.js'

// Every song file has to be playable: these catch typos before they reach the site
describe('song files', () => {
  it('have unique ids', () => {
    const ids = songs.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  for (const song of songs) {
    describe(song.title, () => {
      it('has the basics', () => {
        expect(song.title).toBeTruthy()
        expect(song.artist).toBeTruthy()
        expect(song.emoji, 'emoji for the pick cover').toBeTruthy()
        expect(song.tags?.length, 'at least one category').toBeGreaterThan(0)
        for (const tag of song.tags) expect(TAGS[tag], `category "${tag}"`).toBeDefined()
        expect([1, 2, 3]).toContain(song.level)
        expect(song.bpm).toBeGreaterThan(30)
        expect(['chords-only', 'traditional']).toContain(song.licence)
        if (song.songsterr) expect(song.songsterr).toMatch(/^https:\/\/www\.songsterr\.com\/a\/wsa\/.+-s\d+$/)
      })

      it('has short cues and a known feel on its sections', () => {
        for (const section of Object.values(song.sections)) {
          if (section.cue) expect(section.cue.length, `cue "${section.cue}"`).toBeLessThanOrEqual(40)
          if (section.feel) expect(['soft', 'loud']).toContain(section.feel)
        }
      })

      if (song.melody) {
        it('has a melody in first position that fills whole bars', () => {
          for (const part of song.melody) {
            for (const n of parseMelody(part.notes)) {
              expect([1, 2, 3, 4, 5, 6], part.name).toContain(n.string)
              expect(n.fret, part.name).toBeGreaterThanOrEqual(0)
              expect(n.fret, part.name).toBeLessThanOrEqual(4)
              expect(n.slots, part.name).toBeGreaterThan(0)
            }
            expect(melodyLength(part.notes) % (song.perBeat * song.beatsPerBar), `${part.name} length`).toBe(0)
            if (part.chords) {
              const track = chordTrack(part.chords)
              expect(track.length, `${part.name} chords match the tune`).toBe(melodyLength(part.notes))
              for (const c of track.filter(Boolean)) expect(chords[c], `chord "${c}"`).toBeDefined()
            }
            const lines = melodyTab(part.notes).split('\n')
            expect(new Set(lines.map((l) => l.length)).size, 'tab lines line up').toBe(1)
          }
        })

        it('plays as a melody', () => {
          const tune = melodySong(song)
          const { steps } = buildSteps(tune)
          const { timeline } = buildTimeline(steps)
          expect(steps.length).toBe(song.melody.reduce((n, p) => n + parseMelody(p.notes).length * (p.repeat || 1), 0))
          expect(timeline.length).toBe(song.melody.reduce((n, p) => n + melodyLength(p.notes) * (p.repeat || 1), 0))
        })
      }

      it('only uses sections that exist', () => {
        for (const key of song.form) expect(song.sections[key], `section "${key}"`).toBeDefined()
      })

      it('only uses chords with diagrams and patterns that exist', () => {
        for (const section of Object.values(song.sections)) {
          for (const raw of section.steps) {
            const [chord, pattern = song.defaultPattern] = raw.split('|')
            expect(chords[chord], `chord "${chord}"`).toBeDefined()
            expect(song.patterns[pattern], `pattern "${pattern}"`).toBeDefined()
          }
        }
      })

      it('has patterns that line up with the beat', () => {
        for (const [name, pattern] of Object.entries(song.patterns)) {
          const slots = pattern.split(/\s+/)
          expect(slots.length % song.perBeat, `pattern "${name}"`).toBe(0)
          for (const t of slots) expect(t, `pattern "${name}"`).toMatch(TOKEN)
          // Listen mode moves on when it hears a strum, so every pattern needs one
          expect(slots.some((t) => t !== '-'), `pattern "${name}" has a strum`).toBe(true)
        }
      })

      it('turns into a timeline', () => {
        const { steps } = buildSteps(song)
        const { timeline, stepStart } = buildTimeline(steps)
        expect(steps.length).toBeGreaterThan(0)
        expect(stepStart.length).toBe(steps.length)
        expect(timeline.length).toBe(steps.reduce((n, s) => n + s.pattern.length, 0))
      })
    })
  }
})

describe('steps', () => {
  const louie = songs.find((s) => s.id === 'louie-louie')

  it('expand repeats and patterns', () => {
    const { steps, sectionStarts } = buildSteps(louie)
    expect(steps[0]).toMatchObject({ chord: 'A', section: 'Riff' })
    expect(steps[0].pattern).toEqual(['D', '-', 'D', '-', 'D', '-'])
    expect(steps[1].pattern).toEqual(['D', 'D'])
    expect(sectionStarts[1].step).toBe(16) // riff is 4 steps x 4 repeats
  })

  it('find the last strum, ignoring rests', () => {
    expect(lastStrumOf(['D', '-', 'D', '-', 'D', '-'])).toBe(4)
    expect(lastStrumOf(['D', '-', 'D', 'U', '-', 'U', 'D', 'U'])).toBe(7)
  })

  it('group into bars for the chord sheet', () => {
    expect(barsOf(louie, louie.sections.riff.steps)).toEqual([['A', 'D'], ['Em', 'D']])
  })
})

describe('easy chords', () => {
  it('have diagrams for every swap', () => {
    for (const easy of Object.values(EASY)) expect(chords[easy]).toBeDefined()
  })

  it('swap hard shapes only when asked', () => {
    expect(playable('F', true)).toBe('Fmaj7')
    expect(playable('F', false)).toBe('F')
    expect(playable('G', true)).toBe('G')
    const trouper = songs.find((s) => s.id === 'super-trouper')
    expect(buildSteps(trouper, { easy: true }).steps.some((s) => s.chord === 'Bm7')).toBe(true)
  })
})

describe('melody notes', () => {
  it('are named from their string and fret', () => {
    const name = (string, fret) => chords[noteShape(string, fret)].label
    expect(name(3, 2)).toBe('A')
    expect(name(2, 1)).toBe('C')
    expect(name(4, 4)).toBe('F#')
    expect(name(1, 0)).toBe('E')
  })

  it('treat a rest at the start as a lead-in and elsewhere as holding the note', () => {
    expect(parseMelody('-:4 4-0:1 -:3 3-0:2')).toEqual([
      { string: 4, fret: 0, slots: 4, lead: 4 },
      { string: 3, fret: 0, slots: 2, lead: 0 },
    ])
  })
})

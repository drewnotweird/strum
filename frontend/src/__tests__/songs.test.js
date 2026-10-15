import { describe, expect, it } from 'vitest'
import { songs, buildSteps, buildTimeline, barsOf, lastStrumOf } from '../lib/song.js'
import { chords, EASY, playable } from '../data/chords.js'

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
        expect([1, 2, 3]).toContain(song.level)
        expect(song.bpm).toBeGreaterThan(30)
        expect(['chords-only', 'traditional']).toContain(song.licence)
        if (song.songsterr) expect(song.songsterr).toMatch(/^https:\/\/www\.songsterr\.com\/a\/wsa\/.+-s\d+$/)
      })

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
          for (const t of slots) expect(t, `pattern "${name}"`).toMatch(/^(D|U|-|B|[1-6])$/)
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

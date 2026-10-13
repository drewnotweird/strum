import { describe, expect, it } from 'vitest'
import { songs } from '../lib/song.js'
import { makeCatalogue, search } from '../lib/search.js'
import { streakOf } from '../lib/store.js'
import { BADGES, newlyEarned } from '../lib/badges.js'
import { drumHits } from '../lib/drums.js'

const index = makeCatalogue(songs)
const titles = (opts) => search(index, opts).results.map((r) => r.song.title)

describe('search', () => {
  it('finds songs by title or band', () => {
    expect(titles({ query: 'oasis' })).toEqual(expect.arrayContaining(['Wonderwall', "Don't Look Back in Anger"]))
    expect(titles({ query: 'sandman' })).toEqual(['Enter Sandman'])
  })

  it('treats one chord as "songs with this chord"', () => {
    const withBm = titles({ query: 'Bm' })
    expect(withBm).toContain('Super Trouper')
    expect(withBm).not.toContain('Wonderwall')
  })

  it('treats several chords as "songs you can play with only these"', () => {
    const results = titles({ query: 'G C D' })
    expect(results).toContain('Amazing Grace')
    expect(results).not.toContain('Zombie') // needs Em too
  })

  it('filters by level and learned songs', () => {
    expect(search(index, { level: 3 }).results.every((r) => r.song.level === 3)).toBe(true)
    expect(titles({ learnedOnly: true, learned: ['zombie'] })).toEqual(['Zombie'])
  })
})

const daysAgo = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toLocaleDateString('en-CA')
}

describe('streaks', () => {
  it('count days in a row with at least half a minute of playing', () => {
    expect(streakOf({})).toBe(0)
    expect(streakOf({ [daysAgo(0)]: 40, [daysAgo(1)]: 300, [daysAgo(2)]: 60 })).toBe(3)
    expect(streakOf({ [daysAgo(0)]: 40, [daysAgo(1)]: 10, [daysAgo(2)]: 60 })).toBe(1) // 10 s doesn't count
  })

  it("aren't lost before today's practice has happened", () => {
    expect(streakOf({ [daysAgo(1)]: 60, [daysAgo(2)]: 60 })).toBe(2)
  })
})

describe('badges', () => {
  const base = { learned: [], days: {}, playedChords: [], badges: [], goalMinutes: 10 }

  it('are earned once, when their test passes', () => {
    expect(newlyEarned(base)).toEqual([])
    expect(newlyEarned({ ...base, learned: ['zombie'] }).map((b) => b.id)).toEqual(['first-song'])
    expect(newlyEarned({ ...base, learned: ['zombie'], badges: ['first-song'] })).toEqual([])
  })

  it('include open and power chord badges', () => {
    const open = { ...base, playedChords: ['A', 'Am', 'C', 'D', 'E', 'Em', 'G'] }
    expect(newlyEarned(open).map((b) => b.id)).toContain('open-chords')
    const power = { ...base, playedChords: ['E5', 'G5', 'A5'] }
    expect(newlyEarned(power).map((b) => b.id)).toContain('power')
  })

  it('all have an icon, a name and a how-to', () => {
    for (const b of BADGES) expect(b.icon && b.name && b.how).toBeTruthy()
  })
})

describe('drum beat', () => {
  const bar = (slotsPerBeat, beatsPerBar) =>
    Array.from({ length: slotsPerBeat * beatsPerBar }, (_, s) => drumHits(s, slotsPerBeat, beatsPerBar).join('+'))

  it('is a rock beat in 4/4: kick on 1 and 3, snare on 2 and 4, hats on eighths', () => {
    expect(bar(2, 4)).toEqual(['hat+kick', 'hat', 'hat+snare', 'hat', 'hat+kick', 'hat', 'hat+snare', 'hat'])
  })

  it('is boom-chick-chick in 3/4', () => {
    expect(bar(2, 3)).toEqual(['hat+kick', 'hat', 'hat', 'hat', 'hat', 'hat'])
  })

  it('lilts in 6/8: kick on 1, snare on 4', () => {
    expect(bar(1, 6)).toEqual(['hat+kick', 'hat', 'hat', 'hat+snare', 'hat', 'hat'])
  })

  it('keeps hats on eighths when the song counts in sixteenths', () => {
    expect(bar(4, 4).filter((h) => h.includes('hat')).length).toBe(8)
  })
})

import { describe, expect, it } from 'vitest'
import { songs } from '../lib/song.js'
import { makeCatalogue, search } from '../lib/search.js'
import { bestStreak, lastDays, streakOf } from '../lib/store.js'
import { BADGES, newlyEarned } from '../lib/badges.js'
import { drumHits } from '../lib/drums.js'
import { songOfTheDay } from '../lib/daily.js'
import { getSong, buildSteps } from '../lib/song.js'
import { STRUMS, strumFor } from '../data/strums.js'
import { TOKEN } from '../lib/strum.js'
import { SKILLS, songSkills, stepSkills } from '../lib/skills.js'
import { fingersToMove, trickiestChange } from '../lib/changes.js'
import { voiceFor } from '../lib/guitar.js'

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

describe('progress page numbers', () => {
  it('find the best streak ever, even if it has ended', () => {
    const days = { [daysAgo(10)]: 60, [daysAgo(9)]: 60, [daysAgo(8)]: 60, [daysAgo(7)]: 60, [daysAgo(1)]: 60 }
    expect(bestStreak(days)).toBe(4)
    expect(streakOf(days)).toBe(1)
  })

  it('list the last 7 days in minutes, oldest first, ending today', () => {
    const week = lastDays({ [daysAgo(0)]: 125, [daysAgo(6)]: 60 })
    expect(week).toHaveLength(7)
    expect(week[6].minutes).toBe(2)
    expect(week[0].minutes).toBe(1)
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

describe('library filters', () => {
  it('filter by category, favourites and the chords he knows', () => {
    expect(search(index, { tag: 'christmas' }).results.map((r) => r.song.id).sort()).toEqual(['deck-the-halls', 'jingle-bells'])
    expect(titles({ favouritesOnly: true, favourites: ['riptide'] })).toEqual(['Riptide'])
    const known = new Set(['g', 'c', 'd'])
    const playable = search(index, { knownChords: known }).results
    expect(playable.length).toBeGreaterThan(0)
    for (const r of playable) expect([...r.chordSet].every((c) => known.has(c))).toBe(true)
  })
})

describe('song of the day', () => {
  it('is the same all day and changes between days', () => {
    const morning = new Date(2026, 9, 15, 8)
    const night = new Date(2026, 9, 15, 22)
    expect(songOfTheDay(songs, [], morning).id).toBe(songOfTheDay(songs, [], night).id)
    const week = Array.from({ length: 7 }, (_, i) => songOfTheDay(songs, [], new Date(2026, 9, 15 + i)).id)
    expect(new Set(week).size).toBeGreaterThan(3)
  })

  it('skips songs he has already learned', () => {
    const day = new Date(2026, 9, 15)
    const first = songOfTheDay(songs, [], day)
    expect(songOfTheDay(songs, [first.id], day).id).not.toBe(first.id)
  })
})

describe('strum trainer patterns', () => {
  it('are valid, fill whole bars and have something to strum', () => {
    for (const strum of STRUMS) {
      const slots = strum.pattern.split(' ')
      for (const t of slots) expect(t, strum.id).toMatch(TOKEN)
      expect(slots.length, strum.id).toBe((strum.beats || 4) * 2)
      expect(slots.some((t) => t !== '-'), strum.id).toBe(true)
    }
  })

  it('are recognised when a song uses one', () => {
    expect(strumFor('D - X U - U X U').id).toBe('chuck')
    expect(strumFor('D D')).toBeUndefined()
  })
})

describe('techniques', () => {
  it('are read from a chord and its pattern', () => {
    expect(stepSkills('E5', ['M', 'M'])).toEqual(['power-chords', 'palm-muting'])
    expect(stepSkills('G', ['B', '-', 'D', 'U'])).toEqual(['bass-strums'])
    expect(stepSkills('Am', ['B', '3', '2', '1'])).toEqual(['picking'])
    expect(stepSkills('C', ['D', '-', 'X', 'U'])).toEqual(['chucks'])
  })

  it('each have songs to practise them', () => {
    expect(songSkills(getSong('im-yours'))).toContain('chucks')
    expect(songSkills(getSong('house-of-the-rising-sun'))).toContain('picking')
    const covered = new Set(songs.flatMap(songSkills))
    for (const id of Object.keys(SKILLS)) expect(covered.has(id), id).toBe(true)
  })

  it('can be filtered on in the library', () => {
    const chucky = search(index, { skill: 'chucks' }).results
    expect(chucky.length).toBeGreaterThan(2)
    for (const r of chucky) expect(r.skills).toContain('chucks')
  })
})

describe('chord changes', () => {
  it('count the fingers that move', () => {
    expect(fingersToMove('C', 'C')).toBe(0)
    expect(fingersToMove('C', 'Am')).toBe(1) // only the ring finger moves
    expect(fingersToMove('F5', 'G5')).toBe(1) // the same shape, slid up
    expect(fingersToMove('G', 'C')).toBe(3)
  })

  it('find the trickiest change in a song', () => {
    const tricky = trickiestChange(buildSteps(getSong('creep')).steps)
    expect(tricky.moves).toBeGreaterThanOrEqual(2)
  })

  it("leave out songs where the shape only slides", () => {
    expect(trickiestChange(buildSteps(getSong('smells-like-teen-spirit')).steps)).toBeNull()
  })
})

describe('guitar voices', () => {
  it('play chucks and palm mutes as short, muted strums', () => {
    expect(voiceFor('G', 'X').slap).toBe(true)
    expect(voiceFor('G', 'M').muted).toBeGreaterThan(0)
    expect(voiceFor('G', '-')).toBeNull()
  })

  it('play soft and loud sections at different strengths', () => {
    expect(voiceFor('G', 'D', 0, 'soft').velocity).toBeLessThan(voiceFor('G', 'D').velocity)
    expect(voiceFor('G', 'D', 0, 'loud').velocity).toBeGreaterThan(voiceFor('G', 'D').velocity)
  })

  it('carry each section cue onto its steps', () => {
    expect(buildSteps(getSong('im-yours')).steps[0].cue).toBe('Chucks on 2 and 4')
  })
})

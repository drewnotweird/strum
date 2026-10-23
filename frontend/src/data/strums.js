// The strumming patterns the Strum trainer teaches, easiest first. Our own names and
// descriptions; the patterns themselves are the everyday building blocks of guitar playing.
// `beats` defaults to 4. Songs that use one of these exactly get a "Practise it" link.
export const STRUMS = [
  {
    id: 'downs',
    name: 'All downs',
    pattern: 'D - D - D - D -',
    blurb: 'One down-strum on every beat. Where everyone starts',
  },
  {
    id: 'down-ups',
    name: 'Down-ups',
    pattern: 'D U D U D U D U',
    blurb: 'Down on the beat, up in between. Your arm never stops',
  },
  {
    id: 'faithful',
    name: 'Old faithful',
    pattern: 'D - D U - U D U',
    blurb: 'The pattern behind half the songs here. Keep the arm swinging and miss the strings on the gaps',
  },
  {
    id: 'boom-chuck',
    name: 'Boom-chuck',
    pattern: 'B - D U B - D U',
    blurb: 'Pick the bass note, then strum. Folk and country do this',
  },
  {
    id: 'waltz',
    name: 'Waltz',
    pattern: 'B - D U D U',
    beats: 3,
    blurb: 'Count 1, 2, 3: a bass note, then down-up, down-up',
  },
  {
    id: 'chuck',
    name: 'The chuck',
    pattern: 'D - X U - U X U',
    blurb: 'Old faithful with a slap on 2 and 4: let your strumming hand land flat on the strings',
  },
  {
    id: 'palm-mute',
    name: 'Palm-mute chug',
    pattern: 'M M M M M M M M',
    blurb: 'Rest the side of your hand on the strings by the bridge for a chunky rock sound',
  },
  {
    id: 'off-beat',
    name: 'Off-beats',
    pattern: '- U - U - U - U',
    blurb: 'Only the “and”s: short, sharp up-strums, like reggae',
  },
]

export const strumById = (id) => STRUMS.find((s) => s.id === id)

// The trainer pattern a song pattern matches, if any
export const strumFor = (pattern) => STRUMS.find((s) => s.pattern === pattern.trim().split(/\s+/).join(' '))

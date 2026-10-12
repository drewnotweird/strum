const files = import.meta.glob('../songs/*.json', { eager: true, import: 'default' })

export const songs = Object.values(files).sort(
  (a, b) => a.level - b.level || a.title.localeCompare(b.title)
)

export const getSong = (id) => songs.find((s) => s.id === id)

// Flatten a song's form into the list of chords to play, one entry per chord change.
// A step is "Chord" (default pattern) or "Chord|patternName".
export function buildSteps(song) {
  const steps = []
  const sectionStarts = []
  song.form.forEach((key, formIndex) => {
    const section = song.sections[key]
    sectionStarts.push({ name: section.name, step: steps.length, formIndex })
    for (let r = 0; r < (section.repeat || 1); r++) {
      section.steps.forEach((raw) => {
        const [chord, patternName = song.defaultPattern] = raw.split('|')
        steps.push({
          chord,
          pattern: song.patterns[patternName].split(/\s+/),
          section: section.name,
          formIndex,
        })
      })
    }
  })
  return { steps, sectionStarts }
}

// One entry per strum slot across the whole song, so the player can count time in slots.
export function buildTimeline(steps) {
  const timeline = []
  const stepStart = []
  steps.forEach((step, s) => {
    stepStart.push(timeline.length)
    step.pattern.forEach((_, slot) => timeline.push({ step: s, slot }))
  })
  return { timeline, stepStart }
}

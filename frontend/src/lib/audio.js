import { createGuitar, voiceFor } from './guitar.js'

// One shared audio context and guitar for one-off sounds outside the song player:
// tapping a chord in the library, or a tuner reference note.
let ctx = null
let guitar = null

export function getAudio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    guitar = createGuitar(ctx)
  }
  ctx.resume()
  return { ctx, guitar }
}

export function playChord(name, capo = 0) {
  const voice = voiceFor(name, 'D', capo)
  if (!voice) return
  const { ctx, guitar } = getAudio()
  guitar.play(ctx.currentTime + 0.02, voice)
}

export function playNote(midi) {
  const { ctx, guitar } = getAudio()
  guitar.play(ctx.currentTime + 0.02, { notes: [{ s: 0, midi }], gap: 0, velocity: 1, choke: true })
}

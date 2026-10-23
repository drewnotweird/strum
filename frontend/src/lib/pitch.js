// Autocorrelation pitch detection, only searching the lags a guitar can produce
// (about 70–1000 Hz), which keeps it light enough to run many times a second on a phone.
export function detectPitch(buf, sampleRate) {
  let rms = 0
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i]
  if (Math.sqrt(rms / buf.length) < 0.01) return null // too quiet: nothing being played

  const minLag = Math.floor(sampleRate / 1000)
  const maxLag = Math.min(Math.floor(sampleRate / 70), buf.length >> 1)
  const n = buf.length - maxLag
  const corr = new Float32Array(maxLag + 2)
  for (let lag = minLag - 1; lag <= maxLag + 1; lag++) {
    let sum = 0
    for (let i = 0; i < n; i++) sum += buf[i] * buf[i + lag]
    corr[lag] = sum
  }
  // Skip past the first dip, then find the strongest peak. The waveform also lines up
  // with itself at 2x, 3x… the period, nearly as well, so take the *first* peak that's
  // almost as strong: that's the true period, not an octave below it.
  let lag = minLag
  while (lag < maxLag && corr[lag] > corr[lag + 1]) lag++
  let strongest = lag
  for (let l = lag; l <= maxLag; l++) if (corr[l] > corr[strongest]) strongest = l
  if (corr[strongest] <= 0) return null
  let best = strongest
  for (let l = lag; l < strongest; l++) {
    if (corr[l] >= 0.9 * corr[strongest] && corr[l] >= corr[l - 1] && corr[l] >= corr[l + 1]) {
      best = l
      break
    }
  }
  // Refine between samples with a parabola through the peak
  const [a, b, c] = [corr[best - 1], corr[best], corr[best + 1]]
  const shift = (a - c) / (2 * (a - 2 * b + c)) || 0
  return sampleRate / (best + shift)
}

const midiOf = (freq) => 69 + 12 * Math.log2(freq / 440)
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// The nearest note name to a frequency, e.g. 221 Hz → "A"
export const noteNameOf = (freq) => NAMES[((Math.round(midiOf(freq)) % 12) + 12) % 12]

// Is this frequency the expected note? Within about half a semitone, and an octave out still
// counts (pitch detection can land an octave off, and it's the right note on the guitar)
export function matchesNote(freq, midi, tolerance = 0.5) {
  if (!freq) return false
  const off = (((midiOf(freq) - midi) % 12) + 12) % 12
  return Math.min(off, 12 - off) <= tolerance
}

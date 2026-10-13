# Strum: plan

## What it is
A follow-along chord player, built to help Andrew's son learn guitar. Two boxes on screen:

- **Now:** the chord to play, its diagram, and the strum pattern. Each strum lights up in time.
- **Next:** the chord that follows. After the last strum it slides into Now.

Controls look like keyboard keys: ← previous chord, spacebar play/stop, → next chord. The real keys work too.
A one-bar count-in starts playback, with a metronome click you can turn off, a speed slider (40–100%, default 70%) and section chips to jump to a part.

Layout: landscape = Now left, Next right. Portrait = Now on top and bigger, Next below and smaller.
Style: Duolingo-like. Warm cream paper, chunky rounded buttons with a pressable bottom edge, Nunito, electric blue
(#2F8CF0, dark #1458A8). Difficulty badges stay traffic-light (easy green, medium amber, tricky red). Every text
colour is checked against WCAG AA contrast.

## Features
- **Player:** count-in, click and synthesised guitar (Karplus-Strong strings, real chord voicings incl. capo),
  speed slider, loop a section, speed trainer (+5% each time round the loop), tap a diagram to hear the chord.
  Keeps the screen awake while playing.
- **Chord change timing:** the next chord moves up into NOW on the *last strum* of the current chord, not
  the first strum of the next, so there's a moment's warning to change shape.
- **Listen mode** ("Listen to me"): the microphone moves things on one strum at a time instead of the clock.
  It only detects *that* a strum happened, not whether the chord was right. Detector in `src/lib/listen.js`:
  SuperFlux-style spectral flux (compare with the loudest neighbouring band 3 frames earlier, on compressed
  loudness), robust background, and a raised bar just after each strum so the ringing chord can't retrigger.
  Guitar and click are off while listening so it only hears the player. Sensitivity: noisy / normal / quiet.
- **Tuner** (`/tuner`): microphone pitch detection (autocorrelation over guitar range, first strong peak to avoid
  octave errors) plus reference notes for tuning by ear.
- **Chord change trainer** (`/changes?a=C&b=G&beats=4`): a generated two-chord song in the normal player, looping.
- **Chord library** (`/chords`): every shape, tap to hear, which songs use it.
- **Progress, stored in the browser only** (`src/lib/store.js`, localStorage key `strum`): left-handed diagrams,
  songs marked "I can play this", seconds practised per day. A day counts for the streak at 30 seconds of playing.
- **Installable and offline:** `manifest.webmanifest` + `sw.js` (network-first pages, cache-first hashed assets).

## Content and copyright (important)
There's no open database of popular song tabs, because the songs are copyrighted. So we write our own.

- **Fine to include:** chord progressions, song structure, capo, tempo, our own strum and picking patterns.
- **Never include:** lyrics of copyrighted songs, or tabs copied from other sites (Ultimate Guitar, Songsterr etc).
- **Riff-heavy songs** (e.g. Metallica) become a warm-up drill of the shapes needed (`"kind": "drill"`), plus a link to Songsterr's licensed tab for the real riff.
- **Traditional / public domain songs** (`"licence": "traditional"`) can carry more, but still write our own arrangement, not a famous recording's.
- Every song has `"checked": false` until someone has played it along with the record and confirmed it.

## Song format
One JSON file per song in `frontend/src/songs/`, picked up automatically.

```json
{
  "id": "wonderwall", "title": "Wonderwall", "artist": "Oasis",
  "level": 1-3, "licence": "chords-only" | "traditional", "kind": "drill" (optional),
  "checked": false, "capo": 2, "bpm": 87, "beatsPerBar": 4, "perBeat": 2,
  "patterns": { "main": "D - D U - U D U" },
  "defaultPattern": "main",
  "sections": { "verse": { "name": "Verse", "repeat": 4, "steps": ["Em7", "G*", "A|two"] } },
  "form": ["intro", "verse", "chorus"],
  "notes": "...", "songsterr": "https://..."
}
```

- `perBeat`: pattern slots per beat (2 = eighth notes). `bpm` counts beats.
- Pattern tokens: `D` down, `U` up, `-` rest, `B` bass string of the chord, `1`–`6` a string to pick.
- A step is `"Chord"` (default pattern) or `"Chord|patternName"`. Each step is one Now box, and its pattern is however long that chord lasts. Louie Louie uses a 6-slot pattern on A and a 2-slot one on D.
- Chord shapes live in `src/data/chords.js`. Variants with a `*` (e.g. `G*`, the Wonderwall G) show their `label`.

## Tech
- Vite + React, deployed to Fasthosts via FTP at `/strum/` (own repo: drewnotweird/strum).
- Timing runs on the Web Audio clock (`src/lib/player.js`): clicks are scheduled ahead, a rAF loop reports the current slot, and strum highlights are set on the DOM directly.
- Dev port 5191.

## Decisions log
- **2026-10-12:** Chose our own chord-chart database over scraping or an API. No open source covers popular songs legally.
- **2026-10-12:** First songs: Louie Louie, Wonderwall, House of the Rising Sun (own picking arrangement), Enter Sandman (as a power chord drill).
- **2026-10-12:** Follow-along Now/Next design, keyboard-key controls, Duolingo-like styling.

- **2026-10-12:** Synthesised guitar instead of samples: no downloads, any chord shape and capo works.
- **2026-10-12:** Practice tools (loop, speed trainer, tuner, chord trainer, chord library), learned songs, streaks,
  left-handed mode, offline install. No accounts: progress lives on the device.
- **2026-10-12:** Brand colour changed from green to electric blue (logo, favicon and share image recoloured from
  the original banner).

- **2026-10-13:** Chord moves NOW on its last strum. Listen mode added (tuned on synthesised strums:
  fast/slow strumming, chugging, picking, noisy and quiet rooms; not yet tried with a real guitar and mic).

## Future ideas
- Full barre F once the easy F is comfortable
- Palm-muted sound for the power chord drills
- Sync progress between devices (would need accounts)

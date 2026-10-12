# Strum: plan

## What it is
A follow-along chord player, built to help Andrew's son learn guitar. Two boxes on screen:

- **Now:** the chord to play, its diagram, and the strum pattern. Each strum lights up in time.
- **Next:** the chord that follows. After the last strum it slides into Now.

Controls look like keyboard keys: ← previous chord, spacebar play/stop, → next chord. The real keys work too.
A one-bar count-in starts playback, with a metronome click you can turn off, a speed slider (40–100%, default 70%) and section chips to jump to a part.

Layout: landscape = Now left, Next right. Portrait = Now on top and bigger, Next below and smaller.
Style: Duolingo-like. White, chunky rounded buttons with a pressable bottom edge, Nunito, green and blue.

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

## Future ideas
- Loop a section
- Chord change trainer (switch between two chords against the click)
- Strum sound or play-along audio
- "Songs I can play" progress, Duolingo-style streaks
- Full barre F once the easy F is comfortable

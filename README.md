# iOS Scrabble — Pass & Play

A single-file HTML implementation of Scrabble for two players, designed to be opened and played entirely offline on an iPad using the **HTML Viewer Q** app, in a "pass-and-play" style (one shared device, racks hidden between turns).

## Status

✅ **Implementation complete and verified** (pending final on-device confirmation — see Task 17 in [`tasks.md`](.kiro/specs/scrabble-pass-and-play/tasks.md)).

- [`requirements.md`](.kiro/specs/scrabble-pass-and-play/requirements.md) — functional requirements (EARS-style acceptance criteria)
- [`design.md`](.kiro/specs/scrabble-pass-and-play/design.md) — technical design (architecture, dictionary encoding, persistence strategy, etc.)
- [`tasks.md`](.kiro/specs/scrabble-pass-and-play/tasks.md) — implementation task breakdown with completion notes
- 104/104 unit tests passing (`npm test`), zero network requests in the built file, full playthrough verified in a real browser

## How to play this on an iPad

No build tools are needed on the iPad — only the final `dist/scrabble.html` file:

1. On the iPad, open **Safari** and navigate to:
   ```
   https://raw.githubusercontent.com/ChrisWilliamson123/iOS-scrabble/main/dist/scrabble.html
   ```
2. Tap the Share icon → **Save to Files** (iCloud Drive or On My iPad).
3. Open the **HTML Viewer Q** app and import the file from Files/iCloud Drive.
4. Open it from within HTML Viewer Q to play — fully offline from that point on.

### Persistence smoke test (already run, kept for reference)

```
https://raw.githubusercontent.com/ChrisWilliamson123/iOS-scrabble/main/tests/localstorage-smoke-test.html
```

Confirmed: `localStorage` in HTML Viewer Q survives backgrounding, force-quit/relaunch, and re-importing the file.

## Development

```bash
npm test              # run all unit tests (104 tests, pure logic layer)
npm run build:dict    # rebuild build/dawg.bin.b64 from src/dictionary/wordlist-en-gb.txt
npm run build         # bundle everything into dist/scrabble.html (the single shippable file)
npm run build:all     # both of the above, in order
```

## Project structure

```
.kiro/specs/scrabble-pass-and-play/   - requirements, design, and task-breakdown docs
tests/                                 - standalone smoke-test pages (not part of the game itself)
src/dictionary/                        - raw SCOWL word list + license/provenance docs
src/styles.css                         - all game styling (inlined into dist at build time)
src/game/                              - game source modules (pure logic + rendering)
  board.js, tileData.js, bag.js, dawg.js, dictionary.js, state.js,
  moveValidation.js, scoring.js, turnReducer.js, timer.js, persistence.js, main.js
  render/                              - screen components (Setup, Board+Rack, Interstitial, Game Over, Dict Lookup)
  __tests__/                           - unit tests (node:test)
build/                                  - build-time-only scripts (make-dawg.js, bundle.js)
dist/scrabble.html                      - the ONLY file ever opened on the iPad
```

## Dictionary credit

Word list derived from [SCOWL / English Speller Database (ESDB)](https://github.com/en-wl/wordlist), Copyright 2000-2026 by Kevin Atkinson, used under its permissive license. See [`src/dictionary/SOURCE.md`](src/dictionary/SOURCE.md) and [`src/dictionary/SCOWL-COPYRIGHT.txt`](src/dictionary/SCOWL-COPYRIGHT.txt) for full details.

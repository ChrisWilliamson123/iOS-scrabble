# iOS Scrabble — Pass & Play

A single-file HTML implementation of Scrabble for two players, designed to be opened and played entirely offline on an iPad using the **HTML Viewer Q** app, in a "pass-and-play" style (one shared device, racks hidden between turns).

## Status

🚧 In spec/design phase. See [`.kiro/specs/scrabble-pass-and-play/`](.kiro/specs/scrabble-pass-and-play/) for the full requirements and design documents.

- [`requirements.md`](.kiro/specs/scrabble-pass-and-play/requirements.md) — functional requirements (EARS-style acceptance criteria)
- [`design.md`](.kiro/specs/scrabble-pass-and-play/design.md) — technical design (architecture, dictionary encoding, persistence strategy, etc.)

## How to run this on an iPad

This project requires no build tools on the iPad itself. The workflow is:

1. On the iPad, open **Safari** and navigate to the raw GitHub URL of the file you want (see below).
2. Tap the download/share icon to save it to **Files** (iCloud Drive or On My iPad).
3. Open the **HTML Viewer Q** app and import the file from Files/iCloud Drive.
4. Open it from within HTML Viewer Q to run it — fully offline from that point on.

### Current test file

Before building the full game, we're verifying how `localStorage` behaves inside HTML Viewer Q (whether saved game state survives backgrounding, force-quitting, and re-importing the file). Use this raw URL on the iPad:

```
https://raw.githubusercontent.com/ChrisWilliamson123/iOS-scrabble/main/tests/localstorage-smoke-test.html
```

Follow the on-screen instructions in that file — it walks through the test steps directly.

## Project structure

```
.kiro/specs/scrabble-pass-and-play/   - requirements & design docs
tests/                                 - standalone test/smoke-test pages
src/                                    - (future) game source modules
build/                                  - (future) build script that bundles everything into dist/scrabble.html
dist/                                   - (future) the final single-file build, the only file actually played
```

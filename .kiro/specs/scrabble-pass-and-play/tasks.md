# Implementation Plan

This plan builds the game bottom-up: pure logic modules first (fully unit-testable in Node, no DOM), then the dictionary pipeline, then the runtime/rendering layer, then the build script that produces the single distributable file, and finally on-device verification against the actual iPad + HTML Viewer Q target. Each task references the requirements it satisfies.

- [x] 1. Resolve word list sourcing and licensing
  - Decided against Collins Scrabble Words (commercial, no official open-license distribution) in favour of **SCOWL** (British English, size 70) — a permissively-licensed open word list
  - Documented the chosen source, generation command, and license obligations in `src/dictionary/SOURCE.md`, with the full original license text preserved in `src/dictionary/SCOWL-COPYRIGHT.txt`
  - Generated and committed the raw word list (126,594 lowercase, pure-alphabetic words) at `src/dictionary/wordlist-en-gb.txt`
  - _Requirements: 7.1_
  - _Design: Risks & Open Items #1_

- [x] 2. Scaffold the source project structure
  - Created `src/game/`, `src/dictionary/`, `build/`, `tests/`, `dist/` directories
  - Set up `package.json` with Node's built-in `node:test` runner, no runtime dependencies
  - Added `.gitignore` for `node_modules/`; `dist/scrabble.html` is tracked as the shippable artifact
  - _Requirements: 1.1_
  - _Design: Architecture — Two-stage structure_

- [x] 3. Implement core data constants
  - [x] 3.1 Implemented `src/game/board.js`: 15×15 `BOARD_LAYOUT` premium-square constant and coordinate helpers
    - _Requirements: 4.1_
  - [x] 3.2 Implemented `src/game/tileData.js`: standard tile distribution and letter value table (100 tiles: 98 letters + 2 blanks)
    - _Requirements: 3.4, 8.1_
  - [x] 3.3 Unit tests verify the distribution totals 100 tiles with correct per-letter counts/values (12 tests, `board.test.js` + `tileData.test.js`)
    - _Requirements: 3.4_

- [x] 4. Implement the tile bag module (`src/game/bag.js`)
  - Seeded-PRNG (mulberry32) bag creation, `draw(n)`, `returnAndReshuffle` implemented
  - 8 unit tests: exact 100-tile count, reproducible-seed determinism, draw/return correctness, statistical sanity across many shuffles
  - _Requirements: 3.4, 9.3_

- [x] 5. Implement the game state module (`src/game/state.js`)
  - `GameState` shape, `createInitialState()` factory (shuffled bag, 7-tile deal, starting player), `serialize`/`deserialize` with version field implemented
  - 11 unit tests covering initial-state correctness and serialize/deserialize round-tripping (including corrupt/version-mismatch rejection)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 6. Implement the dictionary build pipeline
  - [x] 6.1–6.2 Implemented `src/game/dawg.js` (trie build + DAWG suffix-merging minimization) and `build/make-dawg.js` (binary node serialization + base64 encoding)
    - _Requirements: 7.1_
  - [x] 6.3 9 unit tests against small known word lists: round-trip encode/decode, prefix-vs-word distinction, suffix-merging verified structurally, multi-byte varint stress test
    - _Requirements: 7.1, 7.2_
  - [x] 6.4 Ran the real pipeline against the 126,345-word SCOWL list: **46,313 DAWG nodes, 398.8 KB packed (531.7 KB base64)** — well under budget. Also fixed a SCOWL data-quality issue found during the build (every single letter A-Z was present; filtered to keep only A/I, the two real English single-letter words)
    - _Requirements: 7.1_

- [x] 7. Implement the runtime dictionary module (`src/game/dictionary.js`)
  - `init(base64)`, `isValidWord()`, `checkWord()` implemented via DAWG traversal
  - 8 unit tests against the real built dictionary: common words, invalid strings, 2-letter edge cases, non-U Q-words, case-insensitivity, single-letter word fix verified
  - _Requirements: 7.2, 7.3_

- [x] 8. Implement move validation (`src/game/moveValidation.js`)
  - Center-square check, linearity check, contiguity/gap + connectivity check, primary+crossing word extraction, dictionary validation, rack-ownership check all implemented as pure functions
  - 17 table-driven unit tests covering every listed scenario including multi-crossing-words and blank-tile handling
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 9. Implement scoring (`src/game/scoring.js`)
  - Per-word letter/word multiplier scoring (only for newly-placed tiles), bingo bonus, end-game adjustment (emptied-rack vs. consecutive-pass cases) implemented
  - 11 unit tests with worked examples, including verifying pre-existing tiles don't re-trigger multipliers
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 10. Implement the turn reducer (`src/game/turnReducer.js`)
  - `applyMove`, `applyPass`, `applyExchange`, `applyTimeout`, `confirmHandoff` (the handoff→PLAYER_TURN transition), plus staging helpers `updatePendingPlacements`/`reorderRack` implemented
  - Game-end detection (bag-empty-rack-emptied / consecutive-passes) wired after every action
  - 16 unit tests including a full scripted end-to-end game played to completion
  - _Requirements: 6.6, 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3_

- [x] 11. Implement the turn timer controller (`src/game/timer.js`)
  - Countdown controller with `start`/`stop`/`getRemainingSec`/`isRunning`, `onTick`/`onExpire` callbacks
  - 4 unit tests using Node's mock timers: tick counts, single-fire expiry, disabled-timer no-op, restart clearing prior countdown
  - _Requirements: 3.2, 3.3, 9.5_

- [x] 12. Implement persistence (`src/game/persistence.js`)
  - `save`/`load` (localStorage), `isStorageSupported` write-then-read-back check, `exportState`/`importState` implemented
  - 10 unit tests against a mock localStorage: round-tripping, missing/corrupt data handled gracefully, export/import round-trip
  - _Requirements: 1.4, 1.5_

- [x] 13. Implement the rendering layer and screens
  - [x] 13.1 Setup screen (`setupScreen.js`): name inputs, timer toggle+duration, Start action, plus an Import-save textarea
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 13.2 Board+Rack screen (`boardRackScreen.js`): full grid, rack with tap-to-select/tap-to-place, Recall All, blank-letter modal, Submit/Pass/Exchange, inline error banners
    - _Requirements: 4.1, 4.2, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.6, 9.1, 9.3, 9.4_
  - [x] 13.3 Zoom implemented as a **manual +/- control** (CSS-transform scale), per Req 4.3's explicit allowance for "an equivalent zoom control" rather than custom pinch-gesture code — verified working in-browser (`scale(1.4)` after two zoom-in taps)
    - _Requirements: 4.3_
  - [x] 13.4 Interstitial screen (`interstitialScreen.js`): read-only board snapshot, both scores, named confirm button; verified in-browser that neither rack is ever rendered on this screen
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 13.5 Game Over screen (`gameOverScreen.js`): adjusted final scores, winner/tie headline, New Game action — verified in-browser
    - _Requirements: 10.3, 10.4_
  - [x] 13.6 Dictionary lookup modal (`dictLookupModal.js`): live-checking text input — verified in-browser (valid/invalid results shown correctly)
    - _Requirements: 7.3_
  - [x] 13.7 `main.js` app controller: exactly one screen mounted per render call, transition to `PLAYER_TURN` only via explicit `confirmHandoff` dispatch
    - _Requirements: 2.3_
  - **Bug found and fixed during browser verification:** blank tiles in the rack weren't getting the `tile--blank` CSS class (both the normal rack and exchange-mode rack renderers hardcoded `isBlank: false`) — fixed in both `rack.js` and `boardRackScreen.js`, then re-verified end-to-end (blank → letter-picker modal → placed on board → scored as 0 pts within a real word).

- [x] 14. Implement responsive/touch styling for iPad
  - `src/styles.css`: `clamp()`-based cell sizing (38pt-min target), portrait/landscape reflow via media query, `touch-action`, `viewport-fit=cover` + safe-area-inset padding
  - Verified via real headless-browser screenshots at 1280×577 (landscape-style) viewport: board+rack correctly laid out side-by-side, legible premium-square labels, functional touch-sized buttons
  - _Requirements: 1.3_

- [x] 15. Implement the build script (`build/bundle.js`)
  - Concatenates 22 JS modules in dependency order into one IIFE script, inlines CSS, embeds the base64 DAWG blob in a `<script type="text/plain">` tag, writes `dist/scrabble.html`
  - `npm run build:dict` then `npm run build` (or `npm run build:all`) regenerates the artifact. **Final size: 0.61 MB.**
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 16. Verify the built file is fully offline
  - Automated static scan (regex grep for URLs/`<script src>`/`<link href>`/`fetch`/`XMLHttpRequest`/`@import`/WebSocket) against `dist/scrabble.html`: **zero matches**
  - Loaded the actual built file via `file://` in a real headless Chromium browser (no dev server, no network) and played a complete game end-to-end: setup → tile placement → scoring (including blank-tile and multiplier cases) → invalid-word rejection → pass-to-game-over → persistence-survives-reload → New Game. All worked correctly; screenshots captured at every step.
  - _Requirements: 1.2_

- [ ] 17. On-device verification pass (iPad + HTML Viewer Q) — **requires the user's physical iPad; cannot be completed in this sandbox**
  - Everything functionally verifiable without physical hardware has been verified (104 unit tests, offline-network scan, and a full real-browser playthrough covering setup, placement, scoring, blank tiles, invalid-word rejection, pass-to-game-over, persistence-survives-reload, zoom, and dictionary lookup — see Task 16).
  - Remaining, hardware-dependent checks only possible on the real device:
    - Transfer `dist/scrabble.html` to the iPad (GitHub raw-URL → Safari → Files/iCloud Drive → HTML Viewer Q import, as already used for the earlier smoke test)
    - Confirm actual touch responsiveness/hit-target comfort (vs. the simulated clicks used in sandbox testing)
    - Confirm pinch/viewport behavior and the manual zoom control feel correct on real iPad screen sizes and in Split View/Slide Over
    - Re-confirm `localStorage` persistence survives backgrounding/force-quit against this specific build's larger, more frequent save payloads (the underlying mechanism was already verified with the dedicated smoke-test page, but worth a final sanity check on the real game)
    - Confirm the per-turn timer's real-world countdown feel and auto-pass behavior
  - Log any UX friction or bugs found on-device and fix before considering the feature fully closed
  - _Requirements: all_

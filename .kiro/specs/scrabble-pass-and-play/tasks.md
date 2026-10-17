# Implementation Plan

This plan builds the game bottom-up: pure logic modules first (fully unit-testable in Node, no DOM), then the dictionary pipeline, then the runtime/rendering layer, then the build script that produces the single distributable file, and finally on-device verification against the actual iPad + HTML Viewer Q target. Each task references the requirements it satisfies.

- [ ] 1. Resolve CSW word list sourcing and licensing
  - Decide on the source for the Collins Scrabble Words list: licensed purchase, a genuinely open-license alternative word list, or an accepted-risk unofficial source — this is a deliberate decision, not a default
  - Document the chosen source and its license/provenance in `src/dictionary/SOURCE.md`
  - Obtain the raw word list as a plain uppercase, one-word-per-line `.txt` file and place it at `src/dictionary/csw.txt`
  - _Requirements: 7.1_
  - _Design: Risks & Open Items #5_

- [ ] 2. Scaffold the source project structure
  - Create `src/game/`, `src/dictionary/`, `build/`, `tests/` (already exists), `dist/` directories per the design's module breakdown
  - Set up a minimal `package.json` with a test runner (e.g., Node's built-in `node:test`) and no runtime dependencies
  - Add a root `.gitignore` for `node_modules/` (keep `dist/scrabble.html` tracked, since that's the shippable artifact)
  - _Requirements: 1.1_
  - _Design: Architecture — Two-stage structure_

- [ ] 3. Implement core data constants
  - [ ] 3.1 Implement `src/game/board.js`: the 15×15 `BOARD_LAYOUT` premium-square constant and coordinate helper functions (row/col bounds checking, center-square check)
    - _Requirements: 4.1_
  - [ ] 3.2 Implement the standard tile distribution and letter value table (100 tiles: 98 letters + 2 blanks) as a constant consumed by bag and scoring modules
    - _Requirements: 3.4, 8.1_
  - [ ] 3.3 Write unit tests verifying the tile distribution totals 100 tiles with correct per-letter counts and point values
    - _Requirements: 3.4_

- [ ] 4. Implement the tile bag module (`src/game/bag.js`)
  - Implement bag creation (shuffled, using a seeded PRNG for reproducible test runs)
  - Implement draw(n) and return-to-bag(tiles) + reshuffle operations
  - Write unit tests: bag starts with exactly 100 tiles matching the distribution; draw reduces bag size correctly; exchange returns and reshuffles correctly; statistical sanity check across many shuffles
  - _Requirements: 3.4, 9.3_
  - _Design: Testing Strategy — Bag/distribution_

- [ ] 5. Implement the game state module (`src/game/state.js`)
  - Define the `GameState` shape (players, board, bag, activePlayerIndex, pendingPlacements, turnPhase, timerConfig, moveHistory, gameOverReason) per the design's data model
  - Implement an initial-state factory function that takes setup options (player names, timer config) and produces a freshly dealt game (shuffled bag, 7 tiles dealt to each player, starting player selected)
  - Implement `serialize(state) -> JSON string` and `deserialize(json) -> state`, including a `version` field for forward-compatibility
  - Write unit tests covering initial state correctness (each player has 7 tiles, bag has 86 remaining, board is empty) and serialize/deserialize round-tripping
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 6. Implement the dictionary build pipeline
  - [ ] 6.1 Implement `build/make-dawg.js`: read `src/dictionary/csw.txt`, build a trie, minimize into a DAWG by merging equivalent suffix subtrees
    - _Requirements: 7.1_
    - _Design: Dictionary Design — Build-time generation_
  - [ ] 6.2 Implement the binary node serialization (letter byte + end-of-word bit + delta/varint-encoded child indices) and base64 encoding, writing `build/dawg.bin.b64`
    - _Requirements: 7.1_
  - [ ] 6.3 Write unit tests using a small known word list (not the full CSW): encode to DAWG, decode, and verify lookups match exactly (valid words found, near-miss words rejected, prefix-only strings rejected)
    - _Requirements: 7.1, 7.2_
  - [ ] 6.4 Run the real pipeline against the sourced `csw.txt` once Task 1 is complete; record the resulting artifact size and compare against the file-size budget noted in the design's Risks section
    - _Requirements: 7.1_

- [ ] 7. Implement the runtime dictionary module (`src/game/dictionary.js`)
  - Implement base64 decode + DAWG node array parsing from the embedded blob (at this stage, load `build/dawg.bin.b64` directly from disk for testing; wiring to the embedded `<script>` tag happens in the build step, Task 13)
  - Implement `isValidWord(word) -> boolean` via DAWG traversal
  - Implement `checkWord(word) -> boolean` as the public API reused by the standalone lookup tool
  - Write unit tests against the real built CSW DAWG: known valid words, known invalid words, 2-letter word edge cases, words containing Q without a following U
  - _Requirements: 7.2, 7.3_

- [ ] 8. Implement move validation (`src/game/moveValidation.js`)
  - Implement the center-square-required check for the first move on an empty board
  - Implement the linearity check (all pending placements share a row or column)
  - Implement the contiguity/gap check and board-connectivity check (non-first moves must touch an existing tile)
  - Implement word extraction: primary-axis run plus each perpendicular crossing word for every newly placed tile
  - Implement dictionary validation across all extracted words, returning a typed success/failure result (per the design's `validateMove` interface) without mutating any input state
  - Implement the rack-ownership check (every pending placement's tile must exist in the active player's rack)
  - Write table-driven unit tests covering: valid first move through center, move rejected for missing center coverage, disconnected move rejected, non-linear move rejected, gap in placements rejected, correct crossing-word extraction (including multiple simultaneous crossing words), blank tile letter assignment handled correctly in word extraction, invalid word correctly identified and named in the rejection
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [ ] 9. Implement scoring (`src/game/scoring.js`)
  - Implement per-word scoring: sum letter values, applying letter multipliers only to cells placed this turn
  - Implement word-multiplier application, only when a newly placed tile occupies that multiplier square
  - Implement total-turn scoring across primary + all crossing words
  - Implement the 50-point bingo bonus when all 7 rack tiles are used in one move
  - Implement end-of-game score adjustment (deduct each player's remaining rack value; add the opponent's remaining rack value to the player who emptied their rack first)
  - Write unit tests with known worked examples: simple word, word crossing a double-letter square, word crossing a double-word square where one tile is pre-existing (must not re-multiply), bingo bonus applied correctly, end-game adjustment for both the "emptied rack" and "both racks non-empty" cases
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 10. Implement the turn reducer (`src/game/turnReducer.js`)
  - Implement `applyMove(state, pendingPlacements)`: runs move validation, and only on success removes tiles from rack, places them on the board, draws replacement tiles from the bag, applies scoring, resets consecutive-pass counters, and transitions `turnPhase` to the handoff interstitial; on failure returns an error without mutating state
  - Implement `applyPass(state)`: ends the turn with no score change, increments the player's consecutive-pass counter, transitions to the handoff interstitial
  - Implement `applyExchange(state, tileIndices)`: validates bag has enough tiles, returns selected tiles to the bag, draws replacements, reshuffles, ends turn with no score change; rejects if bag has fewer tiles than required
  - Implement `applyTimeout(state)`: discards any pending unconfirmed placements back to the rack, behaves as an automatic pass, transitions to the handoff interstitial
  - Implement game-end detection invoked after each reducer action: bag empty + a rack emptied this move, or consecutive pass/exchange rounds reached threshold — on detection, apply end-of-game scoring and transition `turnPhase` to `GAME_OVER` with the appropriate `gameOverReason`
  - Write unit tests covering every action in isolation, plus an end-to-end sequence test that plays a short scripted game to completion and checks the final scores and `gameOverReason`
  - _Requirements: 6.6, 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3_

- [ ] 11. Implement the turn timer controller (`src/game/timer.js`)
  - Implement a countdown controller that ticks on a configurable interval, exposes remaining seconds, and invokes an `onExpire` callback that the runtime wires to `turnReducer.applyTimeout`
  - Ensure the timer is only active during `PLAYER_TURN` phase and is reset/cleared on every phase transition
  - Write unit tests using fake/mocked timers verifying tick counts, expiry firing exactly once, and no firing when the timer is disabled in `timerConfig`
  - _Requirements: 3.2, 3.3, 9.5_

- [ ] 12. Implement persistence (`src/game/persistence.js`)
  - Implement `save(state)`: debounced `localStorage` write of the serialized state, with an immediate (non-debounced) flush path for move submission
  - Implement `load()`: attempt to read and deserialize from `localStorage`; return null on missing/corrupt data without throwing
  - Implement a boot-time `localStorage` write-then-read-back support check, returning a boolean the UI layer uses to decide whether to show the "auto-save unavailable" banner
  - Implement manual export (serialize current state into a copyable text block) and import (parse pasted text back into a valid state, rejecting malformed input with a clear error)
  - Write unit tests covering save/load round-tripping, corrupt-data handling (falls back gracefully, does not throw), and export/import round-tripping
  - _Requirements: 1.4, 1.5_

- [ ] 13. Implement the rendering layer and screens
  - [ ] 13.1 Implement the Setup screen: player name inputs (defaulting to "Player 1"/"Player 2"), timer enable toggle + duration selector, "Start Game" action wired to the state factory from Task 5
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ] 13.2 Implement the Board + Rack screen: 15×15 grid render with premium-square styling, current player's rack tiles, tap-to-select-then-tap-to-place interaction, pending-tile recall (single and recall-all), rack tile reordering, blank-tile letter-assignment prompt, Submit/Pass/Exchange action buttons wired to the turn reducer, and inline error display on invalid submission
    - _Requirements: 4.1, 4.2, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.6, 9.1, 9.3, 9.4_
  - [ ] 13.3 Implement board zoom/pan: compute cell size from available viewport, activate pinch-zoom/pan wrapper and a manual zoom +/- control when computed cell size falls below the 38pt minimum
    - _Requirements: 4.3_
  - [ ] 13.4 Implement the Interstitial (handoff) screen: read-only board snapshot, both players' scores, whose-turn-is-next indicator, and the explicit confirm-to-reveal action that transitions to the Board + Rack screen for the correct player only
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [ ] 13.5 Implement the Game Over screen: final adjusted scores, winner declaration, "New Game" action returning to Setup without a page reload
    - _Requirements: 10.3, 10.4_
  - [ ] 13.6 Implement the standalone dictionary lookup modal: text input + valid/invalid result, accessible from the Board + Rack screen without affecting turn state
    - _Requirements: 7.3_
  - [ ] 13.7 Wire the screen-mounting logic so only one screen is ever constructed in the DOM at a time, driven directly by `turnPhase` (and which player confirmed handoff), per the design's mutual-exclusivity approach
    - _Requirements: 2.3_

- [ ] 14. Implement responsive/touch styling for iPad
  - Implement CSS using `clamp()`/`min()`-based sizing for board and rack, targeting the 38pt minimum cell size
  - Implement portrait (stacked) and landscape (side-by-side) layouts via CSS Grid/media queries
  - Apply `touch-action: manipulation`, `viewport-fit=cover`, and `env(safe-area-inset-*)` padding per the design
  - Manually verify layout at iPad portrait and landscape widths, and in a Split View-sized viewport, using browser dev tools device simulation as a first pass
  - _Requirements: 1.3_
  - _Design: iPad-Specific Design Considerations_

- [ ] 15. Implement the build script (`build/bundle.js`)
  - Concatenate all `src/game/*.js` modules in dependency order into a single IIFE-wrapped script (no ES module syntax at runtime)
  - Inline all CSS into a single `<style>` tag
  - Embed the base64 DAWG blob (from Task 6) into a `<script id="dict-data" type="text/plain">` tag
  - Assemble the final `dist/scrabble.html` with correct `<meta viewport>` tags
  - Add an npm script (e.g., `npm run build`) that regenerates `dist/scrabble.html` from source
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 16. Verify the built file is fully offline
  - Run an automated static scan of `dist/scrabble.html` for any network-triggering patterns (URLs, `<script src=`, `<link rel="stylesheet" href=`, external `<img src=`, `fetch(`, `XMLHttpRequest`, `@import`, WebSocket usage) and confirm zero matches
  - Manually load `dist/scrabble.html` with the network connection disabled (Airplane Mode) and confirm the game boots and is fully playable end-to-end
  - _Requirements: 1.2_
  - _Design: Testing Strategy — Offline/no-network verification_

- [ ] 17. On-device verification pass (iPad + HTML Viewer Q)
  - Transfer `dist/scrabble.html` to the iPad (via the GitHub raw-URL + Files/iCloud Drive workflow already established) and open it in HTML Viewer Q
  - Play a full game end-to-end on-device, confirming: setup flow works, rack-hiding interstitial correctly conceals both racks at every handoff, board is legible and navigable (with zoom fallback if needed) in both orientations, tile placement/recall/reorder work smoothly via touch, blank tile assignment works, dictionary validation rejects/accepts words correctly, scoring matches manual expectation for at least one multiplier-covering move and one bingo, pass/exchange/timer-expiry all correctly advance turns, game-over screen and new-game flow work
  - Confirm persistence survives backgrounding and force-quit on this final build (already verified on the smoke-test page in Task-0 equivalent, but re-confirm against the real game state, which is larger and saved more frequently)
  - Log any UX friction or bugs found and fix before considering the feature complete
  - _Requirements: all_

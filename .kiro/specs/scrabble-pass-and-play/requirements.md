# Requirements Document

## Introduction

This feature is a single-file HTML implementation of Scrabble, designed for two players sharing one iOS device in a "pass-and-play" style, rendered inside an HTML viewer app. The game must be fully self-contained (no network access, no external files), must protect each player's rack from being seen by the other during handoffs, must support navigating a 15×15 board on a small touch screen, and must validate words against an embedded UK Scrabble dictionary (SOWPODS / Collins Scrabble Words).

## Requirements

### Requirement 1: Single-File, Offline Packaging

**User Story:** As a player, I want the entire game bundled in one HTML file, so that I can open it in an iOS HTML viewer app without any network connection or supporting files.

#### Acceptance Criteria

1. WHEN the game is distributed THEN the system SHALL consist of exactly one `.html` file containing all HTML, CSS, JavaScript, dictionary data, and image/graphic assets inline.
2. WHEN the file is opened THEN the system SHALL NOT issue any network requests (no CDN scripts, fonts, images, or APIs).
3. WHEN the file is opened in an iOS HTML viewer app THEN the system SHALL render and be fully playable using only client-side execution.
4. WHEN the viewer app backgrounds, suspends, or reloads the page THEN the system SHALL restore the in-progress game state (board, racks, scores, bag, turn, timer setting) from local persistent storage automatically on reload.
5. WHEN there is no saved game state on load THEN the system SHALL present a new-game setup screen.

### Requirement 2: Pass-and-Play Turn Handoff & Rack Privacy

**User Story:** As a player, I want my tile rack hidden from my opponent during handoff, so that we can fairly share one device without seeing each other's tiles.

#### Acceptance Criteria

1. WHEN a turn ends THEN the system SHALL display a "pass the device" interstitial screen that conceals both players' racks before the next player's rack is shown.
2. WHEN the interstitial screen is displayed THEN the system SHALL require an explicit confirmation action (e.g., a tap naming the incoming player) before revealing that player's rack.
3. WHEN it is not a given player's turn THEN the system SHALL NOT render that player's rack tiles anywhere on screen, including through scrolling, resizing, or navigation within the page.
4. WHEN the interstitial or any public-facing screen is shown THEN the system SHALL display the current board state, both players' scores, and whose turn is next, without revealing either rack.
5. WHEN a player confirms the handoff THEN the system SHALL display only the confirmed player's own rack for the duration of their turn.

### Requirement 3: Game Setup

**User Story:** As a player, I want to configure the game before starting, so that the match reflects our preferred settings.

#### Acceptance Criteria

1. WHEN starting a new game THEN the system SHALL allow entry of two player names (optional, defaulting to "Player 1" / "Player 2").
2. WHEN starting a new game THEN the system SHALL allow the host to enable or disable a per-turn timer.
3. IF the per-turn timer is enabled THEN the system SHALL allow selection of a countdown duration (e.g., 60s / 90s / 120s).
4. WHEN setup is complete THEN the system SHALL initialize a shuffled 100-tile bag (98 lettered tiles per standard English distribution + 2 blanks), deal 7 tiles to each player's rack, and select a starting player.

### Requirement 4: Board Rendering & Navigation

**User Story:** As a player, I want to view and navigate the full 15×15 board on a small touch screen, so that I can see all premium squares and placed tiles even though they don't all fit comfortably at once.

#### Acceptance Criteria

1. WHEN the board is displayed THEN the system SHALL render a standard 15×15 grid with the correct standard premium square layout (double letter, triple letter, double word, triple word, and center square as a double word / starting square).
2. WHEN the board is displayed THEN the system SHALL visually distinguish premium squares, empty normal squares, and squares occupied by placed tiles.
3. WHEN the full board does not fit legibly in the viewport THEN the system SHALL support pinch-to-zoom and/or pan gestures, or an equivalent zoom control, to navigate the grid.
4. WHEN tiles have been placed and confirmed on the board THEN the system SHALL keep them visible and anchored at their coordinates regardless of zoom/pan state, and visible to both players at all times (board state is always public).

### Requirement 5: Rack & Tile Interaction

**User Story:** As a player, I want to place, rearrange, and recall tiles from my rack using touch, so that I can build a word before committing to a move.

#### Acceptance Criteria

1. WHEN it is a player's turn THEN the system SHALL display up to 7 tiles in that player's rack with their letters and point values.
2. WHEN a player taps a rack tile and then taps an empty board square THEN the system SHALL move that tile from the rack to the selected board square as a pending (unconfirmed) placement.
3. WHEN a player taps a pending (unconfirmed) tile on the board THEN the system SHALL allow it to be recalled back to the rack.
4. WHEN a player has pending tiles in their rack THEN the system SHALL allow reordering of rack tiles via touch interaction.
5. WHEN a player places a blank tile on the board THEN the system SHALL prompt the player to assign it a letter, and SHALL treat that tile as worth 0 points regardless of assigned letter.
6. WHEN a move has not yet been submitted THEN the system SHALL allow the player to recall all pending tiles back to the rack in one action.

### Requirement 6: Move Validation

**User Story:** As a player, I want invalid moves rejected with clear feedback, so that the game enforces Scrabble's placement and word rules.

#### Acceptance Criteria

1. IF the board is empty THEN the system SHALL require the first move's tiles to include the center square.
2. IF the board already has tiles THEN the system SHALL require every newly submitted move to be connected to at least one existing tile on the board.
3. WHEN a player submits a move THEN the system SHALL require all newly placed tiles in that move to lie in a single continuous row or column with no gaps (accounting for existing tiles filling gaps).
4. WHEN a move is submitted THEN the system SHALL identify the main word and all secondary (crossing) words formed by the newly placed tiles.
5. WHEN a move is submitted THEN the system SHALL validate every word formed (main and crossing) against the embedded dictionary, and SHALL reject the entire move if any formed word is invalid.
6. IF a submitted move is invalid for any reason (disconnected, non-linear, invalid word, tile not in rack) THEN the system SHALL display a clear error message identifying the problem and SHALL NOT change the board, rack, bag, or score state.
7. WHEN a move uses a tile THEN the system SHALL verify that tile was actually available in the submitting player's rack.

### Requirement 7: Dictionary

**User Story:** As a player, I want word validity checked against a standard UK Scrabble dictionary, so that only legitimate words can be played.

#### Acceptance Criteria

1. WHEN the game file is built THEN the system SHALL embed a SOWPODS / Collins Scrabble Words (CSW) word list directly within the HTML file, compressed/encoded to minimize file size (e.g., trie or delta-encoded structure rather than a flat list).
2. WHEN validating a move THEN the system SHALL check word validity entirely offline using the embedded dictionary, with no network lookups.
3. WHEN a player wants to check a word outside of placing tiles THEN the system SHALL provide a dictionary lookup tool to verify whether a given word is valid.

### Requirement 8: Scoring

**User Story:** As a player, I want my score calculated automatically and correctly, so that I don't have to manually track points.

#### Acceptance Criteria

1. WHEN a move is confirmed valid THEN the system SHALL calculate its score using standard letter point values, applying letter multipliers only to newly placed tiles and word multipliers to any word whose multiplier square was newly covered this turn.
2. WHEN a move's score is calculated AND all 7 tiles from the player's rack were used in that single move THEN the system SHALL add a 50-point bonus.
3. WHEN a move is confirmed THEN the system SHALL add its score to that player's running total and display updated scores for both players.
4. WHEN the game ends THEN the system SHALL deduct the point value of each player's unplayed rack tiles from their score.
5. IF the game ends because one player played their final tile (emptying their rack) THEN the system SHALL add the sum of the opponent's remaining rack tile values to that player's score.

### Requirement 9: Turn Actions

**User Story:** As a player, I want options to submit, pass, or exchange tiles on my turn, so that I have standard Scrabble actions available even when I can't or don't want to play a word.

#### Acceptance Criteria

1. WHEN it is a player's turn THEN the system SHALL present options to submit a move, pass the turn, or exchange tiles.
2. WHEN a player chooses to pass THEN the system SHALL end their turn with no score change and advance to the handoff interstitial.
3. WHEN a player chooses to exchange tiles THEN the system SHALL allow them to select any number of their rack tiles, return the selected tiles to the bag, draw an equal number of replacement tiles, shuffle the bag, and end their turn with no score change.
4. IF fewer than 7 tiles remain in the bag THEN the system SHALL disable or reject the exchange action.
5. WHEN a per-turn timer is enabled AND the countdown reaches zero during a player's turn THEN the system SHALL automatically pass that player's turn, discard any pending unconfirmed tile placements back to the rack, and advance to the handoff interstitial.

### Requirement 10: Game End & Results

**User Story:** As a player, I want the game to correctly detect the end condition and show final results, so that we know who won.

#### Acceptance Criteria

1. WHEN the tile bag is empty AND a player empties their rack on their turn THEN the system SHALL end the game immediately after applying that move's score.
2. WHEN both players consecutively pass or exchange tiles for a defined number of rounds (e.g., two full back-to-back passes/exchanges each) THEN the system SHALL end the game.
3. WHEN the game ends THEN the system SHALL apply the end-game scoring adjustments (Requirement 8.4–8.5) and display final scores for both players with the winner clearly indicated.
4. WHEN the game has ended THEN the system SHALL offer an option to start a new game without requiring the file to be reopened or reloaded.

## Out of Scope (v1)

- Computer/AI opponent.
- Network or remote multiplayer.
- Challenge mechanic for contesting played words.
- More than 2 players.
- User accounts or cloud save/sync (state persists locally on the single device only).

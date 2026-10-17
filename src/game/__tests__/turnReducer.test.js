const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const Dictionary = require('../dictionary.js');
const State = require('../state.js');
const TurnReducer = require('../turnReducer.js');
const TileData = require('../tileData.js');

const dawgPath = path.join(__dirname, '..', '..', '..', 'build', 'dawg.bin.b64');
Dictionary.init(fs.readFileSync(dawgPath, 'utf8'));

function freshState(overrides) {
  return State.createInitialState(Object.assign({ seed: 1, playerNames: ['Alice', 'Bob'] }, overrides || {}));
}

test('applyMove: valid move updates board, rack, score, and advances turn without mutating input', () => {
  const state = freshState();
  const activeIdx = state.activePlayerIndex;
  const player = state.players[activeIdx];
  // Force a known rack so we can play a guaranteed-valid word through center.
  player.rack = ['C', 'A', 'T', 'X', 'X', 'X', 'X'];
  const originalRackCopy = player.rack.slice();

  const pending = [
    { row: 7, col: 6, letter: 'C', isBlank: false },
    { row: 7, col: 7, letter: 'A', isBlank: false },
    { row: 7, col: 8, letter: 'T', isBlank: false }
  ];

  const result = TurnReducer.applyMove(state, pending);
  assert.ok(result.state, JSON.stringify(result.error));
  const next = result.state;

  // Input state must be untouched.
  assert.deepStrictEqual(state.players[activeIdx].rack, originalRackCopy);
  assert.strictEqual(state.board[7][7], null);

  // New state reflects the move. C=3,A=1,T=1 -> sum 5, doubled by the center STAR (DW) -> 10.
  assert.strictEqual(next.board[7][7].letter, 'A');
  assert.strictEqual(next.players[activeIdx].score, 10);
});

test('applyMove: center square move scores correctly including the double-word star', () => {
  const state = freshState();
  const activeIdx = state.activePlayerIndex;
  state.players[activeIdx].rack = ['C', 'A', 'T', 'X', 'X', 'X', 'X'];
  const pending = [
    { row: 7, col: 6, letter: 'C', isBlank: false },
    { row: 7, col: 7, letter: 'A', isBlank: false },
    { row: 7, col: 8, letter: 'T', isBlank: false }
  ];
  const result = TurnReducer.applyMove(state, pending);
  assert.ok(result.state);
  // C(3)+A(1)+T(1)=5, doubled by STAR = 10
  assert.strictEqual(result.state.players[activeIdx].score, 10);
});

test('applyMove: rack refills from bag after a move', () => {
  const state = freshState();
  const activeIdx = state.activePlayerIndex;
  state.players[activeIdx].rack = ['C', 'A', 'T', 'X', 'X', 'X', 'X'];
  const pending = [
    { row: 7, col: 6, letter: 'C', isBlank: false },
    { row: 7, col: 7, letter: 'A', isBlank: false },
    { row: 7, col: 8, letter: 'T', isBlank: false }
  ];
  const result = TurnReducer.applyMove(state, pending);
  assert.strictEqual(result.state.players[activeIdx].rack.length, TileData.RACK_SIZE);
});

test('applyMove: turn advances to the other player and phase becomes AWAITING_HANDOFF_CONFIRM', () => {
  const state = freshState();
  const activeIdx = state.activePlayerIndex;
  state.players[activeIdx].rack = ['C', 'A', 'T', 'X', 'X', 'X', 'X'];
  const pending = [
    { row: 7, col: 6, letter: 'C', isBlank: false },
    { row: 7, col: 7, letter: 'A', isBlank: false },
    { row: 7, col: 8, letter: 'T', isBlank: false }
  ];
  const result = TurnReducer.applyMove(state, pending);
  assert.strictEqual(result.state.activePlayerIndex, activeIdx === 0 ? 1 : 0);
  assert.strictEqual(result.state.turnPhase, 'AWAITING_HANDOFF_CONFIRM');
});

test('applyMove: invalid move returns error and does not mutate state', () => {
  const state = freshState();
  const activeIdx = state.activePlayerIndex;
  state.players[activeIdx].rack = ['Z', 'Q', 'X', 'A', 'A', 'A', 'A'];
  const beforeJson = JSON.stringify(state);
  const pending = [
    { row: 7, col: 7, letter: 'Z', isBlank: false },
    { row: 7, col: 8, letter: 'Q', isBlank: false },
    { row: 7, col: 9, letter: 'X', isBlank: false }
  ];
  const result = TurnReducer.applyMove(state, pending);
  assert.ok(result.error);
  assert.strictEqual(JSON.stringify(state), beforeJson);
});

test('applyPass: ends turn with no score change, increments consecutivePasses', () => {
  const state = freshState();
  const activeIdx = state.activePlayerIndex;
  const scoreBefore = state.players[activeIdx].score;
  const result = TurnReducer.applyPass(state);
  assert.strictEqual(result.state.players[activeIdx].score, scoreBefore);
  assert.strictEqual(result.state.players[activeIdx].consecutivePasses, 1);
  assert.strictEqual(result.state.activePlayerIndex, activeIdx === 0 ? 1 : 0);
});

test('applyExchange: swaps tiles, no score change, ends turn', () => {
  const state = freshState();
  const activeIdx = state.activePlayerIndex;
  state.players[activeIdx].rack = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const scoreBefore = state.players[activeIdx].score;
  const result = TurnReducer.applyExchange(state, [0, 1]); // exchange A and B
  assert.ok(result.state, JSON.stringify(result.error));
  assert.strictEqual(result.state.players[activeIdx].score, scoreBefore);
  assert.strictEqual(result.state.players[activeIdx].rack.length, 7);
  assert.strictEqual(result.state.activePlayerIndex, activeIdx === 0 ? 1 : 0);
});

test('applyExchange: rejected when bag has fewer tiles than needed', () => {
  const state = freshState();
  state.bag = ['A']; // only 1 tile left
  const activeIdx = state.activePlayerIndex;
  state.players[activeIdx].rack = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const result = TurnReducer.applyExchange(state, [0, 1, 2]); // trying to exchange 3, only 1 available
  assert.ok(result.error);
  assert.strictEqual(result.error.reason, 'BAG_TOO_SMALL');
});

test('applyExchange: rejected with empty bag entirely', () => {
  const state = freshState();
  state.bag = [];
  const result = TurnReducer.applyExchange(state, [0]);
  assert.ok(result.error);
  assert.strictEqual(result.error.reason, 'BAG_TOO_SMALL');
});

test('applyTimeout: behaves as an automatic pass', () => {
  const state = freshState();
  const activeIdx = state.activePlayerIndex;
  const result = TurnReducer.applyTimeout(state);
  assert.strictEqual(result.state.players[activeIdx].consecutivePasses, 1);
  assert.strictEqual(result.state.activePlayerIndex, activeIdx === 0 ? 1 : 0);
});

test('game end: consecutive passes by both players ends the game with CONSECUTIVE_PASSES', () => {
  let state = freshState();
  // Pass 4 times total (2 rounds each) to trigger the stall condition.
  for (let i = 0; i < 4; i++) {
    const result = TurnReducer.applyPass(state);
    state = result.state;
  }
  assert.strictEqual(state.turnPhase, 'GAME_OVER');
  assert.strictEqual(state.gameOverReason, 'CONSECUTIVE_PASSES');
});

test('game end: bag empty + rack emptied ends game and applies end-game score adjustment', () => {
  const state = freshState();
  const activeIdx = state.activePlayerIndex;
  const otherIdx = activeIdx === 0 ? 1 : 0;

  // Rig the state: bag empty, active player rack has exactly the tiles to play out entirely.
  state.bag = [];
  state.players[activeIdx].rack = ['C', 'A', 'T'];
  state.players[otherIdx].rack = ['Q', 'Z']; // Q=10, Z=10 -> 20 remaining value
  const otherScoreBefore = state.players[otherIdx].score;

  const pending = [
    { row: 7, col: 6, letter: 'C', isBlank: false },
    { row: 7, col: 7, letter: 'A', isBlank: false },
    { row: 7, col: 8, letter: 'T', isBlank: false }
  ];
  const result = TurnReducer.applyMove(state, pending);
  assert.ok(result.state, JSON.stringify(result.error));
  const next = result.state;

  assert.strictEqual(next.turnPhase, 'GAME_OVER');
  assert.strictEqual(next.gameOverReason, 'BAG_EMPTY_RACK_EMPTIED');
  // The emptying player gained the opponent's remaining rack value (20); opponent lost it.
  assert.strictEqual(next.players[otherIdx].score, otherScoreBefore - 20);
  assert.strictEqual(next.players[activeIdx].score, 10 + 20); // 10 from the move itself + 20 bonus
});

test('confirmHandoff transitions AWAITING_HANDOFF_CONFIRM to PLAYER_TURN', () => {
  const state = freshState();
  assert.strictEqual(state.turnPhase, 'AWAITING_HANDOFF_CONFIRM');
  const result = TurnReducer.confirmHandoff(state);
  assert.ok(result.state);
  assert.strictEqual(result.state.turnPhase, 'PLAYER_TURN');
});

test('confirmHandoff rejected if not currently awaiting handoff', () => {
  const state = freshState();
  const confirmed = TurnReducer.confirmHandoff(state).state;
  const result = TurnReducer.confirmHandoff(confirmed); // already PLAYER_TURN, confirm again
  assert.ok(result.error);
  assert.strictEqual(result.error.reason, 'NOT_AWAITING_HANDOFF');
});

test('end-to-end scripted game: plays to completion via consecutive passes and checks final state', () => {
  let state = freshState({ seed: 55 });
  const p0ScoreStart = state.players[0].score;
  const p1ScoreStart = state.players[1].score;

  // Simulate a short game: both players just pass repeatedly until it ends.
  let guard = 0;
  while (state.turnPhase !== 'GAME_OVER' && guard < 20) {
    const result = TurnReducer.applyPass(state);
    state = result.state;
    guard++;
  }

  assert.strictEqual(state.turnPhase, 'GAME_OVER');
  assert.strictEqual(state.gameOverReason, 'CONSECUTIVE_PASSES');
  // Scores should have been adjusted downward (or stayed same if racks were empty, which
  // they aren't here) by each player's own remaining rack value.
  assert.ok(state.players[0].score <= p0ScoreStart);
  assert.ok(state.players[1].score <= p1ScoreStart);
});

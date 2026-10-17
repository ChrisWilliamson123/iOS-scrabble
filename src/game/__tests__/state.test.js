const test = require('node:test');
const assert = require('node:assert');
const State = require('../state.js');
const TileData = require('../tileData.js');
const Board = require('../board.js');

test('initial state deals 7 tiles to each player', () => {
  const state = State.createInitialState({ seed: 1 });
  assert.strictEqual(state.players[0].rack.length, TileData.RACK_SIZE);
  assert.strictEqual(state.players[1].rack.length, TileData.RACK_SIZE);
});

test('initial state bag has 86 tiles remaining after dealing', () => {
  const state = State.createInitialState({ seed: 2 });
  assert.strictEqual(state.bag.length, 100 - 14);
});

test('initial state board is empty', () => {
  const state = State.createInitialState({ seed: 3 });
  assert.ok(Board.isBoardEmpty(state.board));
});

test('initial state uses default player names when none given', () => {
  const state = State.createInitialState({ seed: 4 });
  assert.strictEqual(state.players[0].name, 'Player 1');
  assert.strictEqual(state.players[1].name, 'Player 2');
});

test('initial state honors provided player names', () => {
  const state = State.createInitialState({ seed: 4, playerNames: ['Alice', 'Bob'] });
  assert.strictEqual(state.players[0].name, 'Alice');
  assert.strictEqual(state.players[1].name, 'Bob');
});

test('initial state honors timer config', () => {
  const state = State.createInitialState({ seed: 4, timerEnabled: true, timerDurationSec: 60 });
  assert.strictEqual(state.timerConfig.enabled, true);
  assert.strictEqual(state.timerConfig.durationSec, 60);
});

test('timer defaults to disabled', () => {
  const state = State.createInitialState({ seed: 4 });
  assert.strictEqual(state.timerConfig.enabled, false);
});

test('serialize/deserialize round-trips exactly', () => {
  const state = State.createInitialState({ seed: 99, playerNames: ['X', 'Y'] });
  const json = State.serialize(state);
  const restored = State.deserialize(json);
  assert.deepStrictEqual(restored, state);
});

test('deserialize returns null for malformed JSON', () => {
  assert.strictEqual(State.deserialize('{not valid json'), null);
});

test('deserialize returns null for missing/mismatched version', () => {
  const bad = JSON.stringify({ version: 999, players: [{}, {}], board: [], bag: [] });
  assert.strictEqual(State.deserialize(bad), null);
});

test('deserialize returns null for structurally invalid state', () => {
  const bad = JSON.stringify({ version: 1, players: [{}], board: [], bag: [] });
  assert.strictEqual(State.deserialize(bad), null);
});

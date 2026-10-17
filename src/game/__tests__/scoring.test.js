const test = require('node:test');
const assert = require('node:assert');
const Board = require('../board.js');
const Scoring = require('../scoring.js');

// Sanity-check our assumptions about square types used below.
test('setup: confirm square types used in these tests', () => {
  assert.strictEqual(Board.getSquareType(3, 4), null);
  assert.strictEqual(Board.getSquareType(3, 5), null);
  assert.strictEqual(Board.getSquareType(3, 6), null);
  assert.strictEqual(Board.getSquareType(0, 3), 'DL');
  assert.strictEqual(Board.getSquareType(7, 7), 'STAR');
  assert.strictEqual(Board.getSquareType(7, 6), null);
  assert.strictEqual(Board.getSquareType(7, 8), null);
});

test('simple word on normal squares: plain sum of letter values', () => {
  // "CAT" at row 3, cols 4-6, all normal squares (no multipliers).
  const cells = [
    { row: 3, col: 4, letter: 'C', isBlank: false, pending: true },
    { row: 3, col: 5, letter: 'A', isBlank: false, pending: true },
    { row: 3, col: 6, letter: 'T', isBlank: false, pending: true }
  ];
  // C=3, A=1, T=1 -> 5
  assert.strictEqual(Scoring.scoreWord(cells), 5);
});

test('word crossing a double-letter square doubles only that letter', () => {
  // "AID" at row 0, cols 1-3. Col 3 is DL.
  const cells = [
    { row: 0, col: 1, letter: 'A', isBlank: false, pending: true },
    { row: 0, col: 2, letter: 'I', isBlank: false, pending: true },
    { row: 0, col: 3, letter: 'D', isBlank: false, pending: true }
  ];
  // A=1, I=1, D=2*2(DL)=4 -> total 6
  assert.strictEqual(Scoring.scoreWord(cells), 6);
});

test('word multiplier applies when a newly placed tile sits on it', () => {
  // Single newly-placed tile directly on the center STAR (double word), as part of a
  // longer word extending onto normal squares.
  const cells = [
    { row: 7, col: 6, letter: 'C', isBlank: false, pending: true },
    { row: 7, col: 7, letter: 'A', isBlank: false, pending: true }, // STAR = DW
    { row: 7, col: 8, letter: 'T', isBlank: false, pending: true }
  ];
  // C=3, A=1, T=1 -> sum 5, doubled by STAR -> 10
  assert.strictEqual(Scoring.scoreWord(cells), 10);
});

test('pre-existing tile on a multiplier square does NOT re-trigger the multiplier', () => {
  // Center STAR tile was placed on an earlier turn (pending:false); this turn only adds
  // C and T on normal squares to extend the word to "CAT". The word multiplier must NOT
  // apply since no newly placed tile sits on the STAR this turn.
  const cells = [
    { row: 7, col: 6, letter: 'C', isBlank: false, pending: true },
    { row: 7, col: 7, letter: 'A', isBlank: false, pending: false }, // pre-existing, on STAR
    { row: 7, col: 8, letter: 'T', isBlank: false, pending: true }
  ];
  // C=3, A=1 (plain, no multiplier since not pending), T=1 -> 5, no word multiplier -> 5
  assert.strictEqual(Scoring.scoreWord(cells), 5);
});

test('blank tile always scores 0 regardless of letter or multiplier square', () => {
  const cells = [
    { row: 0, col: 3, letter: 'Z', isBlank: true, pending: true } // DL square, but blank = 0
  ];
  assert.strictEqual(Scoring.scoreWord(cells), 0);
});

test('scoreMove sums multiple words and applies bingo bonus when all 7 rack tiles used', () => {
  const words = [
    { word: 'CAT', cells: [
      { row: 3, col: 4, letter: 'C', isBlank: false, pending: true },
      { row: 3, col: 5, letter: 'A', isBlank: false, pending: true },
      { row: 3, col: 6, letter: 'T', isBlank: false, pending: true }
    ] }
  ];
  const result = Scoring.scoreMove(words, 7);
  assert.strictEqual(result.bingo, true);
  assert.strictEqual(result.totalScore, 5 + Scoring.BINGO_BONUS);
});

test('scoreMove does not apply bingo bonus when fewer than 7 tiles used', () => {
  const words = [
    { word: 'CAT', cells: [
      { row: 3, col: 4, letter: 'C', isBlank: false, pending: true },
      { row: 3, col: 5, letter: 'A', isBlank: false, pending: true },
      { row: 3, col: 6, letter: 'T', isBlank: false, pending: true }
    ] }
  ];
  const result = Scoring.scoreMove(words, 3);
  assert.strictEqual(result.bingo, false);
  assert.strictEqual(result.totalScore, 5);
});

test('rackValue sums letter values, blanks count as 0', () => {
  assert.strictEqual(Scoring.rackValue(['A', 'E', 'Q']), 1 + 1 + 10);
  assert.strictEqual(Scoring.rackValue(['*', '*']), 0);
  assert.strictEqual(Scoring.rackValue([]), 0);
});

test('end-game adjustment: player who emptied rack gains opponent remaining tile value', () => {
  const players = [
    { score: 100, rack: [] },
    { score: 80, rack: ['Q', 'Z'] } // Q=10, Z=10 -> 20
  ];
  const result = Scoring.applyEndGameAdjustment(players, 0);
  assert.deepStrictEqual(result, [120, 60]);
});

test('end-game adjustment: no one emptied rack (consecutive passes) -- each loses own rack value', () => {
  const players = [
    { score: 50, rack: ['A'] },       // A=1
    { score: 40, rack: ['B', 'C'] }   // B=3, C=3 -> 6
  ];
  const result = Scoring.applyEndGameAdjustment(players, null);
  assert.deepStrictEqual(result, [49, 34]);
});

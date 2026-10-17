const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const Board = require('../board.js');
const Dictionary = require('../dictionary.js');
const MoveValidation = require('../moveValidation.js');

// Load the real dictionary once for all tests in this file.
const dawgPath = path.join(__dirname, '..', '..', '..', 'build', 'dawg.bin.b64');
Dictionary.init(fs.readFileSync(dawgPath, 'utf8'));

function emptyBoard() {
  return Board.createEmptyBoard();
}

function place(row, col, letter, isBlank) {
  return { row: row, col: col, letter: letter, isBlank: !!isBlank };
}

test('valid first move covering center square', () => {
  const board = emptyBoard();
  // "CAT" horizontally through center (7,7)
  const pending = [place(7, 6, 'C'), place(7, 7, 'A'), place(7, 8, 'T')];
  const result = MoveValidation.validateMove({ board, rack: ['C', 'A', 'T', 'X', 'X', 'X', 'X'], pendingPlacements: pending });
  assert.ok(result.valid, JSON.stringify(result));
  assert.strictEqual(result.words[0].word, 'CAT');
});

test('first move rejected if it does not cover center square', () => {
  const board = emptyBoard();
  const pending = [place(0, 0, 'C'), place(0, 1, 'A'), place(0, 2, 'T')];
  const result = MoveValidation.validateMove({ board, rack: ['C', 'A', 'T'], pendingPlacements: pending });
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'CENTER_REQUIRED');
});

test('move rejected when disconnected from existing tiles', () => {
  const board = emptyBoard();
  board[7][7] = { letter: 'A', isBlank: false, owner: 0 };
  // Place "DOG" far away, not touching (7,7)
  const pending = [place(0, 0, 'D'), place(0, 1, 'O'), place(0, 2, 'G')];
  const result = MoveValidation.validateMove({ board, rack: ['D', 'O', 'G'], pendingPlacements: pending });
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'DISCONNECTED');
});

test('move rejected when placements are not linear (not same row or col)', () => {
  const board = emptyBoard();
  board[7][7] = { letter: 'A', isBlank: false, owner: 0 };
  const pending = [place(6, 6, 'B'), place(8, 8, 'C')];
  const result = MoveValidation.validateMove({ board, rack: ['B', 'C'], pendingPlacements: pending });
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'NOT_LINEAR');
});

test('move rejected when there is a gap in the placement', () => {
  const board = emptyBoard();
  // Existing center tile 'A' at (7,7). Try to place C at (7,8) and T at (7,10), skipping (7,9).
  board[7][7] = { letter: 'A', isBlank: false, owner: 0 };
  const pending = [place(7, 8, 'C'), place(7, 10, 'T')];
  const result = MoveValidation.validateMove({ board, rack: ['C', 'T'], pendingPlacements: pending });
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'GAP_IN_PLACEMENT');
});

test('valid move connecting to existing tile, extending a word', () => {
  const board = emptyBoard();
  // Existing word "CAT" horizontally at row 7, cols 6-8.
  board[7][6] = { letter: 'C', isBlank: false, owner: 0 };
  board[7][7] = { letter: 'A', isBlank: false, owner: 0 };
  board[7][8] = { letter: 'T', isBlank: false, owner: 0 };
  // Extend to "CATS" by adding S at (7,9).
  const pending = [place(7, 9, 'S')];
  const result = MoveValidation.validateMove({ board, rack: ['S'], pendingPlacements: pending });
  assert.ok(result.valid, JSON.stringify(result));
  assert.strictEqual(result.words[0].word, 'CATS');
});

test('valid move creates multiple crossing words simultaneously', () => {
  const board = emptyBoard();
  // Existing horizontal word "CAT" at row 7, cols 6-8.
  board[7][6] = { letter: 'C', isBlank: false, owner: 0 };
  board[7][7] = { letter: 'A', isBlank: false, owner: 0 };
  board[7][8] = { letter: 'T', isBlank: false, owner: 0 };
  // Play vertical word "ARE" through the A at (7,7): A(7,7 existing) R(8,7) E(9,7)
  // This also must not break anything horizontally since only touching existing A.
  const pending = [place(8, 7, 'R'), place(9, 7, 'E')];
  const result = MoveValidation.validateMove({ board, rack: ['R', 'E'], pendingPlacements: pending });
  assert.ok(result.valid, JSON.stringify(result));
  assert.strictEqual(result.words[0].word, 'ARE');
});

test('move rejected when it forms an invalid word', () => {
  const board = emptyBoard();
  const pending = [place(7, 7, 'Z'), place(7, 8, 'Q'), place(7, 9, 'X')];
  const result = MoveValidation.validateMove({ board, rack: ['Z', 'Q', 'X'], pendingPlacements: pending });
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'INVALID_WORD');
  assert.ok(result.invalidWords.includes('ZQX'));
});

test('move rejected if any crossing word (not just primary) is invalid', () => {
  const board = emptyBoard();
  board[7][6] = { letter: 'C', isBlank: false, owner: 0 };
  board[7][7] = { letter: 'A', isBlank: false, owner: 0 };
  board[7][8] = { letter: 'T', isBlank: false, owner: 0 };
  // Playing vertical "ZX" through A -- Z(6,7) A(7,7 existing) ... wait need below too.
  // Use a tile below A that creates an invalid 2-letter crossing word "AQ".
  const pending = [place(8, 7, 'Q')];
  const result = MoveValidation.validateMove({ board, rack: ['Q'], pendingPlacements: pending });
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'INVALID_WORD');
});

test('move rejected if tile is not in rack', () => {
  const board = emptyBoard();
  const pending = [place(7, 7, 'A')];
  const result = MoveValidation.validateMove({ board, rack: ['B', 'C'], pendingPlacements: pending });
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'NOT_IN_RACK');
});

test('move rejected if attempting to place on an already-occupied cell', () => {
  const board = emptyBoard();
  board[7][7] = { letter: 'A', isBlank: false, owner: 0 };
  const pending = [place(7, 7, 'B')];
  const result = MoveValidation.validateMove({ board, rack: ['B'], pendingPlacements: pending });
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'CELL_OCCUPIED');
});

test('blank tile handling: blank assigned a letter forms valid words and consumes blank from rack', () => {
  const board = emptyBoard();
  // Blank assigned letter 'A' to play "CAT" at center, blank used for the A.
  const pending = [place(7, 6, 'C'), place(7, 7, 'A', true), place(7, 8, 'T')];
  const result = MoveValidation.validateMove({ board, rack: ['C', '*', 'T'], pendingPlacements: pending });
  assert.ok(result.valid, JSON.stringify(result));
  assert.strictEqual(result.words[0].word, 'CAT');
});

test('blank tile rejected if no blank available in rack', () => {
  const board = emptyBoard();
  const pending = [place(7, 6, 'C'), place(7, 7, 'A', true), place(7, 8, 'T')];
  const result = MoveValidation.validateMove({ board, rack: ['C', 'A', 'T'], pendingPlacements: pending });
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'NOT_IN_RACK');
});

test('nothing placed is rejected', () => {
  const board = emptyBoard();
  const result = MoveValidation.validateMove({ board, rack: ['A', 'B'], pendingPlacements: [] });
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'NOTHING_PLACED');
});

test('duplicate cell targeted twice in same move is rejected', () => {
  const board = emptyBoard();
  const pending = [place(7, 7, 'A'), place(7, 7, 'B')];
  const result = MoveValidation.validateMove({ board, rack: ['A', 'B'], pendingPlacements: pending });
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'DUPLICATE_CELL');
});

test('vertical word extraction works correctly', () => {
  const board = emptyBoard();
  const pending = [place(6, 7, 'C'), place(7, 7, 'A'), place(8, 7, 'T')];
  const result = MoveValidation.validateMove({ board, rack: ['C', 'A', 'T'], pendingPlacements: pending });
  assert.ok(result.valid, JSON.stringify(result));
  assert.strictEqual(result.words[0].word, 'CAT');
  assert.strictEqual(result.primaryAxis, 'vertical');
});

test('single tile extending an existing word in place resolves axis correctly', () => {
  const board = emptyBoard();
  board[7][7] = { letter: 'C', isBlank: false, owner: 0 };
  board[7][8] = { letter: 'A', isBlank: false, owner: 0 };
  board[7][9] = { letter: 'T', isBlank: false, owner: 0 };
  const pending = [place(7, 10, 'S')];
  const result = MoveValidation.validateMove({ board, rack: ['S'], pendingPlacements: pending });
  assert.ok(result.valid, JSON.stringify(result));
  assert.strictEqual(result.words[0].word, 'CATS');
});

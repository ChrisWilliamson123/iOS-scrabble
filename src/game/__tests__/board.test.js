const test = require('node:test');
const assert = require('node:assert');
const Board = require('../board.js');

test('board is 15x15', () => {
  assert.strictEqual(Board.SIZE, 15);
  assert.strictEqual(Board.BOARD_LAYOUT.length, 15);
  Board.BOARD_LAYOUT.forEach((row) => assert.strictEqual(row.length, 15));
});

test('center square is a STAR', () => {
  assert.strictEqual(Board.getSquareType(7, 7), 'STAR');
  assert.ok(Board.isCenterSquare(7, 7));
});

test('corners are triple word squares', () => {
  assert.strictEqual(Board.getSquareType(0, 0), 'TW');
  assert.strictEqual(Board.getSquareType(0, 14), 'TW');
  assert.strictEqual(Board.getSquareType(14, 0), 'TW');
  assert.strictEqual(Board.getSquareType(14, 14), 'TW');
});

test('premium square counts match standard Scrabble board', () => {
  let tw = 0, dw = 0, tl = 0, dl = 0, star = 0;
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const t = Board.getSquareType(r, c);
      if (t === 'TW') tw++;
      else if (t === 'DW') dw++;
      else if (t === 'TL') tl++;
      else if (t === 'DL') dl++;
      else if (t === 'STAR') star++;
    }
  }
  assert.strictEqual(tw, 8, 'triple word squares');
  assert.strictEqual(dw, 16, 'double word squares');
  assert.strictEqual(tl, 12, 'triple letter squares');
  assert.strictEqual(dl, 24, 'double letter squares');
  assert.strictEqual(star, 1, 'center star');
});

test('isInBounds rejects out-of-range coordinates', () => {
  assert.ok(Board.isInBounds(0, 0));
  assert.ok(Board.isInBounds(14, 14));
  assert.ok(!Board.isInBounds(-1, 0));
  assert.ok(!Board.isInBounds(0, 15));
  assert.ok(!Board.isInBounds(15, 15));
});

test('createEmptyBoard produces all-null 15x15 grid', () => {
  const b = Board.createEmptyBoard();
  assert.strictEqual(b.length, 15);
  b.forEach((row) => {
    assert.strictEqual(row.length, 15);
    row.forEach((cell) => assert.strictEqual(cell, null));
  });
});

test('isBoardEmpty detects empty vs non-empty board', () => {
  const b = Board.createEmptyBoard();
  assert.ok(Board.isBoardEmpty(b));
  b[7][7] = { letter: 'A', isBlank: false, owner: 0 };
  assert.ok(!Board.isBoardEmpty(b));
});

const test = require('node:test');
const assert = require('node:assert');
const TileData = require('../tileData.js');

test('tile distribution totals exactly 100 tiles', () => {
  assert.strictEqual(TileData.totalTileCount(), 100);
});

test('standard letter counts and values are correct', () => {
  const expected = {
    A: [9, 1], B: [2, 3], C: [2, 3], D: [4, 2], E: [12, 1],
    F: [2, 4], G: [3, 2], H: [2, 4], I: [9, 1], J: [1, 8],
    K: [1, 5], L: [4, 1], M: [2, 3], N: [6, 1], O: [8, 1],
    P: [2, 3], Q: [1, 10], R: [6, 1], S: [4, 1], T: [6, 1],
    U: [4, 1], V: [2, 4], W: [2, 4], X: [1, 8], Y: [2, 4], Z: [1, 10]
  };
  for (const letter in expected) {
    const [count, value] = expected[letter];
    assert.strictEqual(TileData.DISTRIBUTION[letter].count, count, `count for ${letter}`);
    assert.strictEqual(TileData.DISTRIBUTION[letter].value, value, `value for ${letter}`);
  }
});

test('2 blank tiles worth 0 points', () => {
  assert.strictEqual(TileData.DISTRIBUTION['*'].count, 2);
  assert.strictEqual(TileData.DISTRIBUTION['*'].value, 0);
});

test('letterValue returns 0 for blank regardless of assigned letter', () => {
  assert.strictEqual(TileData.letterValue('Z', true), 0);
  assert.strictEqual(TileData.letterValue('A', true), 0);
});

test('letterValue returns correct point value for normal letters', () => {
  assert.strictEqual(TileData.letterValue('Q', false), 10);
  assert.strictEqual(TileData.letterValue('E', false), 1);
});

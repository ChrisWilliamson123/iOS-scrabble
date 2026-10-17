const test = require('node:test');
const assert = require('node:assert');
const Bag = require('../bag.js');
const TileData = require('../tileData.js');

test('createBag produces exactly 100 tiles', () => {
  const bag = Bag.createBag(42);
  assert.strictEqual(bag.length, 100);
});

test('createBag with seed is reproducible', () => {
  const bagA = Bag.createBag(123);
  const bagB = Bag.createBag(123);
  assert.deepStrictEqual(bagA, bagB);
});

test('createBag with different seeds produces different orders', () => {
  const bagA = Bag.createBag(1);
  const bagB = Bag.createBag(2);
  assert.notDeepStrictEqual(bagA, bagB);
});

test('bag contains correct per-letter counts matching distribution', () => {
  const bag = Bag.createBag(7);
  const counts = {};
  bag.forEach((t) => { counts[t] = (counts[t] || 0) + 1; });
  for (const letter in TileData.DISTRIBUTION) {
    assert.strictEqual(counts[letter] || 0, TileData.DISTRIBUTION[letter].count, `count mismatch for ${letter}`);
  }
});

test('draw removes tiles from bag and returns them', () => {
  const bag = Bag.createBag(5);
  const originalLength = bag.length;
  const drawn = Bag.draw(bag, 7);
  assert.strictEqual(drawn.length, 7);
  assert.strictEqual(bag.length, originalLength - 7);
});

test('draw with n greater than remaining tiles draws all remaining', () => {
  const bag = Bag.createBag(5);
  Bag.draw(bag, 95); // leave 5
  assert.strictEqual(bag.length, 5);
  const drawn = Bag.draw(bag, 10);
  assert.strictEqual(drawn.length, 5);
  assert.strictEqual(bag.length, 0);
});

test('returnAndReshuffle puts tiles back and bag grows accordingly', () => {
  const bag = Bag.createBag(9);
  const drawn = Bag.draw(bag, 7);
  const sizeAfterDraw = bag.length;
  Bag.returnAndReshuffle(bag, drawn, 11);
  assert.strictEqual(bag.length, sizeAfterDraw + 7);
});

test('statistical sanity: many shuffles still total 100 tiles with correct distribution', () => {
  for (let i = 0; i < 20; i++) {
    const bag = Bag.createBag(i * 31 + 1);
    assert.strictEqual(bag.length, 100);
    const blanks = bag.filter((t) => t === '*').length;
    assert.strictEqual(blanks, 2);
  }
});

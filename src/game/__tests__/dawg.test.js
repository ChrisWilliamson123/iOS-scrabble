const test = require('node:test');
const assert = require('node:assert');
const Dawg = require('../dawg.js');

const SMALL_WORDS = ['CAT', 'CAR', 'CARD', 'CARDS', 'CARE', 'CARED', 'DOG', 'DO', 'DOT', 'DOTS', 'A', 'I'];

test('round trip: encode then decode preserves all words as valid', () => {
  const { base64 } = Dawg.buildAndEncode(SMALL_WORDS);
  const decoded = Dawg.loadFromBase64(base64);
  for (const w of SMALL_WORDS) {
    assert.ok(Dawg.lookup(decoded, w), `expected ${w} to be valid`);
  }
});

test('round trip: non-words and prefixes are rejected', () => {
  const { base64 } = Dawg.buildAndEncode(SMALL_WORDS);
  const decoded = Dawg.loadFromBase64(base64);
  const notWords = ['CA', 'CARDI', 'DOGS', 'XYZ', 'CARDBOARD', ''];
  for (const w of notWords) {
    assert.ok(!Dawg.lookup(decoded, w), `expected ${w} to be invalid`);
  }
});

test('prefix-only strings (not themselves marked as words) are rejected', () => {
  // "CARDS" is a word but "CARD" and "CAR" are also words in our set -- use a prefix
  // that is NOT independently a word to verify isWord flag matters, not just path existence.
  const words = ['CARDBOARD'];
  const { base64 } = Dawg.buildAndEncode(words);
  const decoded = Dawg.loadFromBase64(base64);
  assert.ok(Dawg.lookup(decoded, 'CARDBOARD'));
  assert.ok(!Dawg.lookup(decoded, 'CARD')); // valid path, but not a complete word in this set
  assert.ok(!Dawg.lookup(decoded, 'CARDBOAR'));
});

test('DAWG minimization produces fewer or equal nodes than raw trie', () => {
  const result = Dawg.buildAndEncode(SMALL_WORDS);
  assert.ok(result.dawgNodeCount <= result.trieNodeCount);
});

test('DAWG correctly merges shared suffixes (structural check)', () => {
  // "CARDS" and "DOTS" both end in "S" after distinct prefixes but more usefully,
  // CARED and DOTED-like cases would share suffix nodes. We verify via node count instead
  // of inspecting internals: a word list with heavy suffix repetition should DAWG-minimize
  // to meaningfully fewer nodes than a trie (which only shares prefixes).
  const words = [];
  const prefixes = ['CAR', 'BAR', 'FAR', 'TAR', 'JAR', 'MAR', 'PAR'];
  const suffix = 'RING';
  prefixes.forEach((p) => words.push(p + suffix));
  const result = Dawg.buildAndEncode(words);
  assert.ok(result.dawgNodeCount < result.trieNodeCount, 'DAWG should merge shared suffix chains');
});

test('lookup on empty decoded dawg returns false for any word', () => {
  const { base64 } = Dawg.buildAndEncode([]);
  const decoded = Dawg.loadFromBase64(base64);
  assert.ok(!Dawg.lookup(decoded, 'ANY'));
});

test('single-letter words are handled correctly', () => {
  const { base64 } = Dawg.buildAndEncode(['A', 'I']);
  const decoded = Dawg.loadFromBase64(base64);
  assert.ok(Dawg.lookup(decoded, 'A'));
  assert.ok(Dawg.lookup(decoded, 'I'));
  assert.ok(!Dawg.lookup(decoded, 'B'));
});

test('varint encoding handles large node counts (round trip stress)', () => {
  // Build a word list where each word has a UNIQUE suffix (the trailing digits-as-letters
  // block differs per word), so suffix-merging cannot collapse the tree down to a handful
  // of nodes -- this forces > 127 distinct nodes and exercises multi-byte varint indices.
  const words = [];
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < letters.length; i++) {
    for (let j = 0; j < letters.length; j++) {
      // Unique, non-shareable suffix per word: encodes (i, j) into the tail letters.
      words.push('Z' + letters[i] + letters[j] + letters[(i + j) % 26] + letters[(i * 3 + j) % 26]);
    }
  }
  const { base64, dawgNodeCount } = Dawg.buildAndEncode(words);
  assert.ok(dawgNodeCount > 127, `expected > 127 nodes to exercise multi-byte varint encoding, got ${dawgNodeCount}`);
  const decoded = Dawg.loadFromBase64(base64);
  // Spot check a sample of words.
  words.slice(0, 5).forEach((w) => assert.ok(Dawg.lookup(decoded, w), `expected ${w} valid`));
  words.slice(-5).forEach((w) => assert.ok(Dawg.lookup(decoded, w), `expected ${w} valid`));
  assert.ok(!Dawg.lookup(decoded, 'ZAAEN'));
});

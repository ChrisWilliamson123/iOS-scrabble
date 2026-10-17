const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const Dictionary = require('../dictionary.js');

const dawgPath = path.join(__dirname, '..', '..', '..', 'build', 'dawg.bin.b64');

test('setup: real built DAWG loads successfully', () => {
  assert.ok(fs.existsSync(dawgPath), 'build/dawg.bin.b64 must exist -- run `npm run build:dict` first');
  const base64 = fs.readFileSync(dawgPath, 'utf8');
  Dictionary.init(base64);
  assert.ok(Dictionary.isInitialized());
});

test('known common words are valid', () => {
  const words = ['CAT', 'DOG', 'HOUSE', 'SCRABBLE', 'COLOUR', 'FAVOURITE', 'THE', 'AND'];
  for (const w of words) {
    assert.ok(Dictionary.isValidWord(w), `expected ${w} to be valid`);
  }
});

test('known invalid strings are rejected', () => {
  const words = ['ZZZQX', 'NOTAWORDXYZ', 'QX', ''];
  for (const w of words) {
    assert.ok(!Dictionary.isValidWord(w), `expected ${w} to be invalid`);
  }
});

test('2-letter word edge cases', () => {
  // Common valid Scrabble-style 2-letter words.
  const valid = ['OX', 'AT', 'IN', 'ON', 'TO', 'GO', 'SO', 'IT'];
  for (const w of valid) {
    assert.ok(Dictionary.isValidWord(w), `expected ${w} to be valid`);
  }
  // 2-letter combos extremely unlikely to be real words.
  const invalid = ['ZX', 'QX', 'JQ'];
  for (const w of invalid) {
    assert.ok(!Dictionary.isValidWord(w), `expected ${w} to be invalid`);
  }
});

test('words containing Q not followed by U', () => {
  // This word list includes some non-U Q words common in Scrabble play.
  const candidates = ['QI', 'QADI', 'QAT'];
  let foundAtLeastOne = false;
  for (const w of candidates) {
    if (Dictionary.isValidWord(w)) foundAtLeastOne = true;
  }
  assert.ok(foundAtLeastOne, 'expected at least one non-U Q-word to be present in the word list');
});

test('lookup is case-insensitive', () => {
  assert.ok(Dictionary.isValidWord('cat'));
  assert.ok(Dictionary.isValidWord('Cat'));
  assert.ok(Dictionary.isValidWord('CAT'));
});

test('checkWord (standalone lookup tool API) matches isValidWord', () => {
  assert.strictEqual(Dictionary.checkWord('HOUSE'), Dictionary.isValidWord('HOUSE'));
  assert.strictEqual(Dictionary.checkWord('ZZZXQ'), Dictionary.isValidWord('ZZZXQ'));
});

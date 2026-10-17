#!/usr/bin/env node
// build/make-dawg.js — reads the raw SCOWL-derived word list, builds a DAWG, and writes
// the base64-encoded binary blob to build/dawg.bin.b64 for embedding by build/bundle.js.
// Run via `npm run build:dict`. Not part of the runtime — this is a build-time-only step.

'use strict';

const fs = require('fs');
const path = require('path');
const Dawg = require('../src/game/dawg.js');

const SRC_PATH = path.join(__dirname, '..', 'src', 'dictionary', 'wordlist-en-gb.txt');
const OUT_PATH = path.join(__dirname, 'dawg.bin.b64');

function main() {
  console.log('Reading word list from', SRC_PATH);
  const raw = fs.readFileSync(SRC_PATH, 'utf8');
  const lines = raw.split(/\r?\n/);

  const words = [];
  let skipped = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const upper = trimmed.toUpperCase();
    if (!/^[A-Z]+$/.test(upper)) {
      skipped++;
      continue;
    }
    words.push(upper);
  }

  console.log(`Read ${words.length} words (skipped ${skipped} non-alphabetic lines).`);

  // Known SCOWL data-quality quirk: every single letter A-Z appears in the source list
  // (leftover from initials/abbreviation entries), but in real English/Scrabble only
  // "A" and "I" are valid standalone single-letter words. Filter the rest out so e.g.
  // "W" alone can't be played as a word. See src/dictionary/SOURCE.md for this caveat.
  const VALID_SINGLE_LETTER_WORDS = new Set(['A', 'I']);
  let singleLetterRemoved = 0;
  const filteredWords = words.filter((w) => {
    if (w.length === 1 && !VALID_SINGLE_LETTER_WORDS.has(w)) {
      singleLetterRemoved++;
      return false;
    }
    return true;
  });
  console.log(`Removed ${singleLetterRemoved} invalid single-letter entries (kept only A, I).`);

  // De-duplicate defensively (the source list shouldn't have dupes, but build-time dedupe is cheap insurance).
  const uniqueWords = Array.from(new Set(filteredWords));
  if (uniqueWords.length !== words.length) {
    console.log(`Removed ${words.length - uniqueWords.length} duplicate entries.`);
  }
  uniqueWords.sort();

  console.log('Building trie + minimizing to DAWG...');
  const t0 = Date.now();
  const result = Dawg.buildAndEncode(uniqueWords);
  const elapsed = Date.now() - t0;

  console.log(`Trie nodes:  ${result.trieNodeCount}`);
  console.log(`DAWG nodes:  ${result.dawgNodeCount}`);
  console.log(`Byte length: ${result.byteLength} (${(result.byteLength / 1024).toFixed(1)} KB)`);
  console.log(`Base64 length: ${result.base64.length} (${(result.base64.length / 1024).toFixed(1)} KB)`);
  console.log(`Build time: ${elapsed}ms`);

  fs.writeFileSync(OUT_PATH, result.base64, 'utf8');
  console.log('Wrote', OUT_PATH);

  // Quick sanity spot-check: decode what we just wrote and verify a handful of known words.
  const decoded = Dawg.loadFromBase64(result.base64);
  const sampleValid = ['THE', 'SCRABBLE', 'QUIZ', 'ZEBRA', 'A', 'I', 'OX'];
  const sampleInvalid = ['ZZZZZ', 'QX', 'NOTAREALWORDXYZ', 'W', 'B', 'Z'];
  let ok = true;
  for (const w of sampleValid) {
    const found = Dawg.lookup(decoded, w);
    console.log(`  sanity: ${w} -> ${found ? 'VALID' : 'MISSING'}`);
    if (!found) ok = false;
  }
  for (const w of sampleInvalid) {
    const found = Dawg.lookup(decoded, w);
    console.log(`  sanity: ${w} -> ${found ? 'UNEXPECTEDLY VALID' : 'correctly invalid'}`);
    if (found) ok = false;
  }
  if (!ok) {
    console.error('Sanity check FAILED — dictionary build looks incorrect.');
    process.exit(1);
  }
  console.log('Sanity check passed.');
}

main();

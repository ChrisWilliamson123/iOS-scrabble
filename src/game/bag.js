// bag.js — tile bag creation, shuffling, draw/return operations.
// Uses a seeded PRNG (mulberry32) so tests can produce reproducible shuffles;
// real gameplay seeds from Date.now()/crypto for genuine randomness.

(function (global) {
  'use strict';

  var TileData = typeof module !== 'undefined' && module.exports
    ? require('./tileData.js')
    : global.Scrabble.TileData;

  // mulberry32: small, fast, seeded PRNG. Returns a function producing floats in [0, 1).
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function defaultRandom() {
    return Math.random();
  }

  // Fisher-Yates shuffle, in place. `rng` is a 0..1 float generator.
  function shuffle(array, rng) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = array[i];
      array[i] = array[j];
      array[j] = tmp;
    }
    return array;
  }

  // Builds the full set of 100 tiles unshuffled (letters repeated per distribution, '*' for blanks).
  function buildFullTileSet() {
    var tiles = [];
    var dist = TileData.DISTRIBUTION;
    for (var letter in dist) {
      if (dist.hasOwnProperty(letter)) {
        var count = dist[letter].count;
        for (var i = 0; i < count; i++) {
          tiles.push(letter);
        }
      }
    }
    return tiles;
  }

  // Creates a shuffled bag. `seed` is optional; if omitted, uses Math.random (non-reproducible).
  function createBag(seed) {
    var tiles = buildFullTileSet();
    var rng = typeof seed === 'number' ? mulberry32(seed) : defaultRandom;
    return shuffle(tiles, rng);
  }

  // Draws up to `n` tiles from the front of the bag (mutates bag array, returns drawn tiles).
  // If fewer than n remain, draws all remaining tiles.
  function draw(bag, n) {
    var drawn = [];
    var count = Math.min(n, bag.length);
    for (var i = 0; i < count; i++) {
      drawn.push(bag.shift());
    }
    return drawn;
  }

  // Returns tiles to the bag and reshuffles. Mutates bag in place. `seed` optional for tests.
  function returnAndReshuffle(bag, tiles, seed) {
    for (var i = 0; i < tiles.length; i++) {
      bag.push(tiles[i]);
    }
    var rng = typeof seed === 'number' ? mulberry32(seed) : defaultRandom;
    shuffle(bag, rng);
    return bag;
  }

  var Bag = {
    buildFullTileSet: buildFullTileSet,
    createBag: createBag,
    draw: draw,
    returnAndReshuffle: returnAndReshuffle,
    shuffle: shuffle,
    mulberry32: mulberry32
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Bag;
  } else {
    global.Scrabble = global.Scrabble || {};
    global.Scrabble.Bag = Bag;
  }
})(typeof window !== 'undefined' ? window : globalThis);

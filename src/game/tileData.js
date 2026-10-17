// tileData.js — standard English Scrabble tile distribution (100 tiles) and letter values.
// Exposed on Scrabble.TileData.

(function (global) {
  'use strict';

  // count = number of tiles in the bag, value = points per tile.
  // Blank tiles ('') have count 2 and are always worth 0 points regardless of assigned letter.
  var DISTRIBUTION = {
    A: { count: 9, value: 1 },
    B: { count: 2, value: 3 },
    C: { count: 2, value: 3 },
    D: { count: 4, value: 2 },
    E: { count: 12, value: 1 },
    F: { count: 2, value: 4 },
    G: { count: 3, value: 2 },
    H: { count: 2, value: 4 },
    I: { count: 9, value: 1 },
    J: { count: 1, value: 8 },
    K: { count: 1, value: 5 },
    L: { count: 4, value: 1 },
    M: { count: 2, value: 3 },
    N: { count: 6, value: 1 },
    O: { count: 8, value: 1 },
    P: { count: 2, value: 3 },
    Q: { count: 1, value: 10 },
    R: { count: 6, value: 1 },
    S: { count: 4, value: 1 },
    T: { count: 6, value: 1 },
    U: { count: 4, value: 1 },
    V: { count: 2, value: 4 },
    W: { count: 2, value: 4 },
    X: { count: 1, value: 8 },
    Y: { count: 2, value: 4 },
    Z: { count: 1, value: 10 },
    '*': { count: 2, value: 0 } // blank tile marker
  };

  var RACK_SIZE = 7;
  var TOTAL_TILES = 100;

  function letterValue(letter, isBlank) {
    if (isBlank) return 0;
    var entry = DISTRIBUTION[letter];
    return entry ? entry.value : 0;
  }

  function totalTileCount() {
    var total = 0;
    for (var key in DISTRIBUTION) {
      if (DISTRIBUTION.hasOwnProperty(key)) {
        total += DISTRIBUTION[key].count;
      }
    }
    return total;
  }

  var TileData = {
    DISTRIBUTION: DISTRIBUTION,
    RACK_SIZE: RACK_SIZE,
    TOTAL_TILES: TOTAL_TILES,
    BLANK_MARKER: '*',
    letterValue: letterValue,
    totalTileCount: totalTileCount
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TileData;
  } else {
    global.Scrabble = global.Scrabble || {};
    global.Scrabble.TileData = TileData;
  }
})(typeof window !== 'undefined' ? window : globalThis);

// dictionary.js — runtime dictionary API: decode the embedded base64 DAWG blob once at
// startup, then provide fast word-validity lookups. Wraps dawg.js with the game-facing API.

(function (global) {
  'use strict';

  var Dawg = typeof module !== 'undefined' && module.exports ? require('./dawg.js') : global.Scrabble.Dawg;

  var decoded = null; // lazily initialized via init()

  // In the browser build, the base64 blob lives in a <script id="dict-data" type="text/plain">
  // tag (see build/bundle.js). In Node (tests, build scripts), callers pass the base64
  // string directly, typically read from build/dawg.bin.b64.
  function init(base64) {
    decoded = Dawg.loadFromBase64(base64);
    return decoded;
  }

  function isInitialized() {
    return decoded !== null;
  }

  function isValidWord(word) {
    if (!decoded) {
      throw new Error('Dictionary not initialized — call Dictionary.init(base64) first.');
    }
    if (typeof word !== 'string' || word.length === 0) return false;
    return Dawg.lookup(decoded, word.toUpperCase());
  }

  // Public API for the standalone dictionary lookup tool (Req 7.3) — same underlying check.
  function checkWord(word) {
    return isValidWord(word);
  }

  var Dictionary = {
    init: init,
    isInitialized: isInitialized,
    isValidWord: isValidWord,
    checkWord: checkWord
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dictionary;
  } else {
    global.Scrabble = global.Scrabble || {};
    global.Scrabble.Dictionary = Dictionary;
  }
})(typeof window !== 'undefined' ? window : globalThis);

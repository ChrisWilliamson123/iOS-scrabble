// state.js — GameState shape, initial state factory, serialize/deserialize.

(function (global) {
  'use strict';

  var Board = typeof module !== 'undefined' && module.exports ? require('./board.js') : global.Scrabble.Board;
  var Bag = typeof module !== 'undefined' && module.exports ? require('./bag.js') : global.Scrabble.Bag;
  var TileData = typeof module !== 'undefined' && module.exports ? require('./tileData.js') : global.Scrabble.TileData;

  var SCHEMA_VERSION = 1;

  /**
   * Creates a fresh game state.
   * options: {
   *   playerNames: [string, string] (optional, defaults to "Player 1"/"Player 2"),
   *   timerEnabled: boolean (default false),
   *   timerDurationSec: number (default 90),
   *   seed: number (optional, for reproducible test games),
   *   startingPlayerIndex: 0|1 (optional, random if omitted)
   * }
   */
  function createInitialState(options) {
    options = options || {};
    var names = options.playerNames || ['Player 1', 'Player 2'];
    var seed = typeof options.seed === 'number' ? options.seed : undefined;

    var bag = Bag.createBag(seed);

    var rack0 = Bag.draw(bag, TileData.RACK_SIZE);
    var rack1 = Bag.draw(bag, TileData.RACK_SIZE);

    var startingPlayerIndex = typeof options.startingPlayerIndex === 'number'
      ? options.startingPlayerIndex
      : (typeof seed === 'number' ? seed % 2 : Math.round(Math.random()));

    return {
      version: SCHEMA_VERSION,
      players: [
        { name: names[0] || 'Player 1', score: 0, rack: rack0, consecutivePasses: 0 },
        { name: names[1] || 'Player 2', score: 0, rack: rack1, consecutivePasses: 0 }
      ],
      activePlayerIndex: startingPlayerIndex,
      board: Board.createEmptyBoard(),
      bag: bag,
      pendingPlacements: [],
      turnPhase: 'AWAITING_HANDOFF_CONFIRM', // first handoff reveals the starting player's rack
      timerConfig: {
        enabled: !!options.timerEnabled,
        durationSec: options.timerDurationSec || 90
      },
      timerRemainingSec: options.timerDurationSec || 90,
      moveHistory: [],
      gameOverReason: null
    };
  }

  function serialize(state) {
    return JSON.stringify(state);
  }

  // Returns parsed state, or null if the JSON is malformed or the version is unrecognized.
  function deserialize(json) {
    var parsed;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      return null;
    }
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== SCHEMA_VERSION) return null;
    // Minimal structural sanity check to avoid crashing later on obviously corrupt data.
    if (!Array.isArray(parsed.players) || parsed.players.length !== 2) return null;
    if (!Array.isArray(parsed.board) || parsed.board.length !== 15) return null;
    if (!Array.isArray(parsed.bag)) return null;
    return parsed;
  }

  var State = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    createInitialState: createInitialState,
    serialize: serialize,
    deserialize: deserialize
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = State;
  } else {
    global.Scrabble = global.Scrabble || {};
    global.Scrabble.State = State;
  }
})(typeof window !== 'undefined' ? window : globalThis);

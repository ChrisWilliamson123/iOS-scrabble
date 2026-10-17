// turnReducer.js — applyMove / applyPass / applyExchange / applyTimeout.
// Each function takes the current state and returns either a NEW state object (never
// mutates its input) or { error: {...} } on failure, per the design's reducer contract.
// Game-end detection runs after every successful action.

(function (global) {
  'use strict';

  function req(name) {
    return typeof module !== 'undefined' && module.exports ? require('./' + name + '.js') : global.Scrabble[cap(name)];
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  var Board = req('board');
  var Bag = req('bag');
  var TileData = req('tileData');
  var MoveValidation = req('moveValidation');
  var Scoring = req('scoring');

  var PASS_ROUNDS_TO_END = 2; // each player passing/exchanging twice in a row ends the game

  function deepCloneBoard(board) {
    return board.map(function (row) { return row.slice(); });
  }

  function clonePlayers(players) {
    return players.map(function (p) {
      return { name: p.name, score: p.score, rack: p.rack.slice(), consecutivePasses: p.consecutivePasses };
    });
  }

  function cloneState(state) {
    return {
      version: state.version,
      players: clonePlayers(state.players),
      activePlayerIndex: state.activePlayerIndex,
      board: deepCloneBoard(state.board),
      bag: state.bag.slice(),
      pendingPlacements: state.pendingPlacements.slice(),
      turnPhase: state.turnPhase,
      timerConfig: { enabled: state.timerConfig.enabled, durationSec: state.timerConfig.durationSec },
      timerRemainingSec: state.timerRemainingSec,
      moveHistory: state.moveHistory.slice(),
      gameOverReason: state.gameOverReason
    };
  }

  function removeFromRack(rack, letter, isBlank) {
    var key = isBlank ? TileData.BLANK_MARKER : letter;
    var idx = rack.indexOf(key);
    if (idx === -1) return false;
    rack.splice(idx, 1);
    return true;
  }

  function otherIndex(i) { return i === 0 ? 1 : 0; }

  // Checks post-action game-end conditions. Returns { ended: bool, reason, emptiedPlayerIndex }.
  function checkGameEnd(state, justEmptiedPlayerIndex) {
    if (state.bag.length === 0 && justEmptiedPlayerIndex !== null && justEmptiedPlayerIndex !== undefined) {
      return { ended: true, reason: 'BAG_EMPTY_RACK_EMPTIED', emptiedPlayerIndex: justEmptiedPlayerIndex };
    }
    var allStalled = state.players.every(function (p) { return p.consecutivePasses >= PASS_ROUNDS_TO_END; });
    if (allStalled) {
      return { ended: true, reason: 'CONSECUTIVE_PASSES', emptiedPlayerIndex: null };
    }
    return { ended: false };
  }

  function finalizeGameEnd(state, endInfo) {
    var newScores = Scoring.applyEndGameAdjustment(state.players, endInfo.emptiedPlayerIndex);
    state.players.forEach(function (p, i) { p.score = newScores[i]; });
    state.turnPhase = 'GAME_OVER';
    state.gameOverReason = endInfo.reason;
    state.pendingPlacements = [];
  }

  function advanceTurn(state) {
    state.activePlayerIndex = otherIndex(state.activePlayerIndex);
    state.turnPhase = 'AWAITING_HANDOFF_CONFIRM';
    state.pendingPlacements = [];
    state.timerRemainingSec = state.timerConfig.durationSec;
  }

  /**
   * Attempts to apply a move for the current active player.
   * pendingPlacements: [{row, col, letter, isBlank}]
   * Returns { state: newState } on success, or { error: {...} } on failure (input state untouched).
   */
  function applyMove(state, pendingPlacements) {
    var activeIdx = state.activePlayerIndex;
    var player = state.players[activeIdx];

    var validation = MoveValidation.validateMove({
      board: state.board,
      rack: player.rack,
      pendingPlacements: pendingPlacements
    });

    if (!validation.valid) {
      return { error: validation };
    }

    var next = cloneState(state);
    var nextPlayer = next.players[activeIdx];

    // Remove used tiles from rack, place them on the board.
    for (var i = 0; i < pendingPlacements.length; i++) {
      var p = pendingPlacements[i];
      var removed = removeFromRack(nextPlayer.rack, p.letter, p.isBlank);
      if (!removed) {
        // Defensive: should be unreachable since validateMove already checked rack ownership.
        return { error: { valid: false, reason: 'NOT_IN_RACK', tile: p.letter } };
      }
      next.board[p.row][p.col] = { letter: p.letter, isBlank: !!p.isBlank, owner: activeIdx };
    }

    // Score the move.
    var scoreResult = Scoring.scoreMove(validation.words, pendingPlacements.length);
    nextPlayer.score += scoreResult.totalScore;
    nextPlayer.consecutivePasses = 0;

    // Draw replacement tiles.
    var drawn = Bag.draw(next.bag, pendingPlacements.length);
    nextPlayer.rack = nextPlayer.rack.concat(drawn);

    next.moveHistory.push({
      playerIndex: activeIdx,
      words: validation.words.map(function (w) { return w.word; }),
      score: scoreResult.totalScore,
      tilesUsed: pendingPlacements.length,
      timestamp: Date.now()
    });

    var emptiedThisMove = nextPlayer.rack.length === 0 ? activeIdx : null;
    var endInfo = checkGameEnd(next, emptiedThisMove);
    if (endInfo.ended) {
      finalizeGameEnd(next, endInfo);
    } else {
      advanceTurn(next);
    }

    return { state: next };
  }

  function applyPass(state) {
    var next = cloneState(state);
    var activeIdx = next.activePlayerIndex;
    next.players[activeIdx].consecutivePasses++;

    var endInfo = checkGameEnd(next, null);
    if (endInfo.ended) {
      finalizeGameEnd(next, endInfo);
    } else {
      advanceTurn(next);
    }
    return { state: next };
  }

  // tileIndices: array of indices into the active player's rack to exchange.
  function applyExchange(state, tileIndices) {
    if (state.bag.length < 1) {
      return { error: { valid: false, reason: 'BAG_TOO_SMALL' } };
    }
    if (!tileIndices || tileIndices.length === 0) {
      return { error: { valid: false, reason: 'NOTHING_SELECTED' } };
    }
    if (tileIndices.length > state.bag.length) {
      return { error: { valid: false, reason: 'BAG_TOO_SMALL' } };
    }

    var next = cloneState(state);
    var activeIdx = next.activePlayerIndex;
    var player = next.players[activeIdx];

    var sortedIndices = tileIndices.slice().sort(function (a, b) { return b - a; });
    var removedTiles = [];
    for (var i = 0; i < sortedIndices.length; i++) {
      var idx = sortedIndices[i];
      if (idx < 0 || idx >= player.rack.length) {
        return { error: { valid: false, reason: 'INVALID_TILE_INDEX' } };
      }
      removedTiles.push(player.rack.splice(idx, 1)[0]);
    }

    var drawn = Bag.draw(next.bag, removedTiles.length);
    player.rack = player.rack.concat(drawn);
    Bag.returnAndReshuffle(next.bag, removedTiles);

    player.consecutivePasses++; // exchange counts as a non-scoring turn for stall detection

    var endInfo = checkGameEnd(next, null);
    if (endInfo.ended) {
      finalizeGameEnd(next, endInfo);
    } else {
      advanceTurn(next);
    }
    return { state: next };
  }

  // Called when the per-turn timer expires. Discards pending placements (they were never
  // committed to the board) and behaves as an automatic pass.
  function applyTimeout(state) {
    var passResult = applyPass(state);
    return passResult;
  }

  // Lightweight staging update: replaces pendingPlacements with no validation. Used while
  // the player is still arranging tiles on the board, before Submit is pressed. Also removes
  // the staged tiles from the displayed rack is handled by the renderer (rack shows only
  // tiles NOT currently staged), so the rack array itself is untouched here.
  function updatePendingPlacements(state, newPendingPlacements) {
    var next = cloneState(state);
    next.pendingPlacements = newPendingPlacements.slice();
    return { state: next };
  }

  // Reorders the active player's rack tiles for display purposes (pure cosmetic, no rule
  // implications). fromIndex/toIndex are indices into the rack array.
  function reorderRack(state, fromIndex, toIndex) {
    var next = cloneState(state);
    var rack = next.players[next.activePlayerIndex].rack;
    if (fromIndex < 0 || fromIndex >= rack.length || toIndex < 0 || toIndex >= rack.length) {
      return { error: { valid: false, reason: 'INVALID_TILE_INDEX' } };
    }
    var tile = rack.splice(fromIndex, 1)[0];
    rack.splice(toIndex, 0, tile);
    return { state: next };
  }

  // Transitions from the handoff interstitial into the active player's turn. This is the
  // ONLY path by which a rack becomes visible (Req 2.1/2.2) -- it never happens automatically.
  function confirmHandoff(state) {
    if (state.turnPhase !== 'AWAITING_HANDOFF_CONFIRM') {
      return { error: { valid: false, reason: 'NOT_AWAITING_HANDOFF' } };
    }
    var next = cloneState(state);
    next.turnPhase = 'PLAYER_TURN';
    next.timerRemainingSec = next.timerConfig.durationSec;
    return { state: next };
  }

  var TurnReducer = {
    PASS_ROUNDS_TO_END: PASS_ROUNDS_TO_END,
    applyMove: applyMove,
    applyPass: applyPass,
    applyExchange: applyExchange,
    applyTimeout: applyTimeout,
    confirmHandoff: confirmHandoff,
    updatePendingPlacements: updatePendingPlacements,
    reorderRack: reorderRack,
    // exported for tests:
    checkGameEnd: checkGameEnd
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TurnReducer;
  } else {
    global.Scrabble = global.Scrabble || {};
    global.Scrabble.TurnReducer = TurnReducer;
  }
})(typeof window !== 'undefined' ? window : globalThis);

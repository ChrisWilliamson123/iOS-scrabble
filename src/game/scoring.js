// scoring.js — turn scoring (letter/word multipliers, bingo bonus) and end-game adjustment.

(function (global) {
  'use strict';

  var Board = typeof module !== 'undefined' && module.exports ? require('./board.js') : global.Scrabble.Board;
  var TileData = typeof module !== 'undefined' && module.exports ? require('./tileData.js') : global.Scrabble.TileData;

  var BINGO_BONUS = 50;

  // Computes the score for a single extracted word. `cells` is an array of
  // { row, col, letter, isBlank, pending } as produced by moveValidation's extractRun.
  // Only `pending` cells get their letter/word multipliers applied -- pre-existing tiles
  // contribute their plain letter value only (their multiplier was consumed when first played).
  function scoreWord(cells) {
    var wordMultiplier = 1;
    var sum = 0;
    for (var i = 0; i < cells.length; i++) {
      var cell = cells[i];
      var base = TileData.letterValue(cell.letter, cell.isBlank);
      var letterMult = 1;
      if (cell.pending) {
        var squareType = Board.getSquareType(cell.row, cell.col);
        if (squareType === 'DL') letterMult = 2;
        else if (squareType === 'TL') letterMult = 3;
        else if (squareType === 'DW' || squareType === 'STAR') wordMultiplier *= 2;
        else if (squareType === 'TW') wordMultiplier *= 3;
      }
      sum += base * letterMult;
    }
    return sum * wordMultiplier;
  }

  // words: array of { word, cells, isPrimary } from moveValidation.validateMove's success result.
  // tilesPlacedCount: number of tiles placed this turn (for bingo bonus check).
  // Returns { totalScore, perWord: [{word, score}], bingo: bool }
  function scoreMove(words, tilesPlacedCount) {
    var perWord = [];
    var total = 0;
    words.forEach(function (w) {
      var s = scoreWord(w.cells);
      perWord.push({ word: w.word, score: s });
      total += s;
    });
    var bingo = tilesPlacedCount === TileData.RACK_SIZE;
    if (bingo) total += BINGO_BONUS;
    return { totalScore: total, perWord: perWord, bingo: bingo };
  }

  // Sums the point value of a rack's remaining tiles. rack: array of letters ('*' = blank).
  function rackValue(rack) {
    var sum = 0;
    rack.forEach(function (letter) {
      sum += TileData.letterValue(letter, letter === TileData.BLANK_MARKER);
    });
    return sum;
  }

  // Applies standard Scrabble end-of-game score adjustments.
  // players: [{score, rack}, {score, rack}] -- returns new scores array [score0, score1],
  // does not mutate input. emptiedPlayerIndex: index of the player who went out (emptied
  // their rack), or null if the game ended by consecutive passes (no one emptied their rack).
  function applyEndGameAdjustment(players, emptiedPlayerIndex) {
    var values = players.map(function (p) { return rackValue(p.rack); });
    var newScores = players.map(function (p) { return p.score; });

    if (emptiedPlayerIndex !== null && emptiedPlayerIndex !== undefined) {
      // The emptying player gains the sum of everyone else's remaining tile values;
      // everyone else simply loses their own remaining tile value (not mirrored).
      for (var i = 0; i < players.length; i++) {
        if (i === emptiedPlayerIndex) continue;
        newScores[i] -= values[i];
        newScores[emptiedPlayerIndex] += values[i];
      }
    } else {
      // No one emptied their rack (game ended by consecutive passes/exchanges):
      // everyone simply deducts their own remaining tile value.
      for (var j = 0; j < players.length; j++) {
        newScores[j] -= values[j];
      }
    }
    return newScores;
  }

  var Scoring = {
    BINGO_BONUS: BINGO_BONUS,
    scoreWord: scoreWord,
    scoreMove: scoreMove,
    rackValue: rackValue,
    applyEndGameAdjustment: applyEndGameAdjustment
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Scoring;
  } else {
    global.Scrabble = global.Scrabble || {};
    global.Scrabble.Scoring = Scoring;
  }
})(typeof window !== 'undefined' ? window : globalThis);

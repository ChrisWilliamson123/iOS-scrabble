// moveValidation.js — pure functions validating a pending move against board/rack state.
// Depends on board.js (coordinates/premium squares) and dictionary.js (word checks).
// No mutation of any input — callers (turnReducer.js) apply the effects only after success.

(function (global) {
  'use strict';

  var Board = typeof module !== 'undefined' && module.exports ? require('./board.js') : global.Scrabble.Board;
  var Dictionary = typeof module !== 'undefined' && module.exports ? require('./dictionary.js') : global.Scrabble.Dictionary;

  // pendingPlacements: [{ row, col, letter, isBlank }]
  // board: 15x15 array of null | { letter, isBlank, owner }

  function sortByRowCol(placements) {
    return placements.slice().sort(function (a, b) {
      return a.row - b.row || a.col - b.col;
    });
  }

  // Returns { horizontal: bool, vertical: bool } -- both true if placements.length === 1
  // (a single tile could extend either axis; context resolves it during word extraction).
  function determineAxis(placements) {
    if (placements.length <= 1) return { horizontal: true, vertical: true };
    var rows = {}; var cols = {};
    placements.forEach(function (p) { rows[p.row] = true; cols[p.col] = true; });
    var singleRow = Object.keys(rows).length === 1;
    var singleCol = Object.keys(cols).length === 1;
    return { horizontal: singleRow, vertical: singleCol };
  }

  function getCell(board, row, col) {
    if (!Board.isInBounds(row, col)) return null;
    return board[row][col];
  }

  // Merges pending placements onto a virtual read-only view of the board: returns a function
  // (row, col) -> cell-like object or null, without mutating the real board.
  function makeVirtualBoard(board, pendingPlacements) {
    var overlay = {};
    pendingPlacements.forEach(function (p) {
      overlay[p.row + ',' + p.col] = { letter: p.letter, isBlank: !!p.isBlank, pending: true };
    });
    return function (row, col) {
      var key = row + ',' + col;
      if (overlay.hasOwnProperty(key)) return overlay[key];
      return getCell(board, row, col);
    };
  }

  // Extracts the contiguous run of letters through (row, col) along the given axis,
  // using the virtual board (existing + pending tiles). Returns null if the run length is 1
  // (a "word" of a single letter isn't a crossing word worth validating) unless `allowSingle`.
  function extractRun(virtualBoard, row, col, axis, allowSingle) {
    var dr = axis === 'vertical' ? 1 : 0;
    var dc = axis === 'vertical' ? 0 : 1;

    var startRow = row, startCol = col;
    while (virtualBoard(startRow - dr, startCol - dc)) {
      startRow -= dr; startCol -= dc;
    }
    var cells = [];
    var r = startRow, c = startCol;
    while (true) {
      var cell = virtualBoard(r, c);
      if (!cell) break;
      cells.push({ row: r, col: c, letter: cell.letter, isBlank: cell.isBlank, pending: !!cell.pending });
      r += dr; c += dc;
    }
    if (cells.length <= 1 && !allowSingle) return null;
    return cells;
  }

  function cellsToWord(cells) {
    return cells.map(function (c) { return c.letter; }).join('');
  }

  /**
   * Validates a move. Does not mutate board/players.
   * @param {object} params
   * @param {Array} params.board - 15x15 board
   * @param {Array} params.rack - active player's rack tiles (array of letters, '*' for blank)
   * @param {Array} params.pendingPlacements - [{row, col, letter, isBlank, fromRackIndex}]
   * @returns {object} { valid: true, words: [{word, cells}], primaryAxis } | { valid: false, reason, invalidWords? }
   */
  function validateMove(params) {
    var board = params.board;
    var rack = params.rack;
    var pendingPlacements = params.pendingPlacements || [];

    if (pendingPlacements.length === 0) {
      return { valid: false, reason: 'NOTHING_PLACED' };
    }

    // --- Rack ownership check ---------------------------------------------------------
    // Build a mutable copy of rack counts to ensure each physical tile is only "used" once,
    // and that blanks claimed as a specific letter actually came from a blank tile in rack.
    var rackCounts = {};
    rack.forEach(function (t) { rackCounts[t] = (rackCounts[t] || 0) + 1; });
    for (var i = 0; i < pendingPlacements.length; i++) {
      var p = pendingPlacements[i];
      var key = p.isBlank ? '*' : p.letter;
      if (!rackCounts[key] || rackCounts[key] <= 0) {
        return { valid: false, reason: 'NOT_IN_RACK', tile: p.letter };
      }
      rackCounts[key]--;
    }

    // --- Duplicate-cell / occupied-cell check ------------------------------------------
    var seen = {};
    for (i = 0; i < pendingPlacements.length; i++) {
      p = pendingPlacements[i];
      var k = p.row + ',' + p.col;
      if (seen[k]) return { valid: false, reason: 'DUPLICATE_CELL' };
      seen[k] = true;
      if (getCell(board, p.row, p.col) !== null) {
        return { valid: false, reason: 'CELL_OCCUPIED', row: p.row, col: p.col };
      }
      if (!Board.isInBounds(p.row, p.col)) {
        return { valid: false, reason: 'OUT_OF_BOUNDS', row: p.row, col: p.col };
      }
    }

    var boardEmpty = Board.isBoardEmpty(board);

    // --- Center square check (first move only) -----------------------------------------
    if (boardEmpty) {
      var coversCenter = pendingPlacements.some(function (p) {
        return Board.isCenterSquare(p.row, p.col);
      });
      if (!coversCenter) {
        return { valid: false, reason: 'CENTER_REQUIRED' };
      }
    }

    // --- Linearity check -----------------------------------------------------------------
    var axisInfo = determineAxis(pendingPlacements);
    if (!axisInfo.horizontal && !axisInfo.vertical) {
      return { valid: false, reason: 'NOT_LINEAR' };
    }

    // Pick the primary axis. If placements span multiple rows AND multiple cols, it's
    // already rejected above. If exactly one placement, axis is ambiguous -- resolved by
    // checking which axis actually has board-adjacency (handled naturally during contiguity
    // check below by trying both and seeing which produces a valid multi-cell primary run,
    // falling back to either if board is otherwise empty aside from this one tile).
    var primaryAxis = axisInfo.horizontal && !axisInfo.vertical ? 'horizontal'
      : (!axisInfo.horizontal && axisInfo.vertical ? 'vertical' : null);

    var virtualBoard = makeVirtualBoard(board, pendingPlacements);

    // --- Contiguity / gap check + connectivity ------------------------------------------
    // Determine the span (min..max) along the primary axis and ensure every cell is filled
    // (by pending or pre-existing tile). For a single-tile placement, we must infer the axis:
    // try horizontal first, then vertical, picking whichever yields a sensible run; if neither
    // axis has any neighboring tiles, the placement is a lone tile on (otherwise empty) board,
    // which is valid only as the very first move (center square, already checked above).
    function checkAxisContiguity(axis) {
      var dr = axis === 'vertical' ? 1 : 0;
      var dc = axis === 'vertical' ? 0 : 1;
      var rows = pendingPlacements.map(function (p) { return p.row; });
      var cols = pendingPlacements.map(function (p) { return p.col; });
      var minRow = Math.min.apply(null, rows), maxRow = Math.max.apply(null, rows);
      var minCol = Math.min.apply(null, cols), maxCol = Math.max.apply(null, cols);

      // For single-tile placements we don't yet know the real extent; walk outward from the tile.
      if (pendingPlacements.length === 1) {
        var only = pendingPlacements[0];
        minRow = maxRow = only.row; minCol = maxCol = only.col;
      }

      var r = minRow, c = minCol;
      var gapFound = false;
      while (true) {
        if (!virtualBoard(r, c)) { gapFound = true; break; }
        if (r === maxRow && c === maxCol) break;
        r += dr; c += dc;
      }
      return !gapFound;
    }

    var contiguous;
    if (primaryAxis) {
      contiguous = checkAxisContiguity(primaryAxis);
      if (!contiguous) return { valid: false, reason: 'GAP_IN_PLACEMENT' };
    } else {
      // Single tile: contiguity trivially holds (span is just that one cell); axis will be
      // resolved during word extraction by checking both directions for adjacent tiles.
      primaryAxis = 'horizontal'; // placeholder; real extraction checks both below
    }

    // --- Connectivity check (non-first moves must touch an existing tile) ---------------
    if (!boardEmpty) {
      var touchesExisting = false;
      for (i = 0; i < pendingPlacements.length; i++) {
        p = pendingPlacements[i];
        var neighbors = [[p.row - 1, p.col], [p.row + 1, p.col], [p.row, p.col - 1], [p.row, p.col + 1]];
        for (var n = 0; n < neighbors.length; n++) {
          var nr = neighbors[n][0], nc = neighbors[n][1];
          if (getCell(board, nr, nc) !== null) { touchesExisting = true; break; }
        }
        if (touchesExisting) break;
      }
      // Also: if the pending tiles themselves form a run that incorporates existing tiles
      // (checked via virtualBoard producing a run longer than pendingPlacements.length),
      // that also counts as connected.
      if (!touchesExisting && pendingPlacements.length === 1) {
        // handled by extraction fallback below (single tile with no neighbors = disconnected)
      }
      if (!touchesExisting) {
        // Re-check: maybe the primary run (once extracted) is longer than just the pending
        // cells, meaning it attaches to existing tiles even though no direct 4-neighbor
        // match was found above (shouldn't normally happen, but double-check via extraction).
        var provisionalAxis = primaryAxis;
        var provisionalRun = extractRun(virtualBoard, pendingPlacements[0].row, pendingPlacements[0].col, provisionalAxis, true);
        if (!provisionalRun || provisionalRun.length === pendingPlacements.length) {
          return { valid: false, reason: 'DISCONNECTED' };
        }
      }
    }

    // --- Word extraction -------------------------------------------------------------------
    var words = [];

    // Resolve the true primary axis for single-tile placements now that we know the board.
    if (pendingPlacements.length === 1) {
      var tile = pendingPlacements[0];
      var hRun = extractRun(virtualBoard, tile.row, tile.col, 'horizontal', true);
      var vRun = extractRun(virtualBoard, tile.row, tile.col, 'vertical', true);
      var hLen = hRun ? hRun.length : 1;
      var vLen = vRun ? vRun.length : 1;
      if (hLen > 1) primaryAxis = 'horizontal';
      else if (vLen > 1) primaryAxis = 'vertical';
      // else: lone tile on otherwise-empty board (only valid as first move, center square) --
      // falls through; primary word will just be the single letter itself (length 1), which
      // is fine for the very first move (e.g., playing a 1-letter word like "A" or "I").
    }

    var primaryCells = extractRun(virtualBoard, pendingPlacements[0].row, pendingPlacements[0].col, primaryAxis, true);
    if (primaryCells && primaryCells.length >= 1) {
      words.push({ word: cellsToWord(primaryCells), cells: primaryCells, isPrimary: true });
    }

    // Crossing words: for each pending tile, extract the perpendicular run (only counts if length > 1).
    var crossAxis = primaryAxis === 'horizontal' ? 'vertical' : 'horizontal';
    for (i = 0; i < pendingPlacements.length; i++) {
      p = pendingPlacements[i];
      var crossRun = extractRun(virtualBoard, p.row, p.col, crossAxis, false);
      if (crossRun && crossRun.length > 1) {
        words.push({ word: cellsToWord(crossRun), cells: crossRun, isPrimary: false });
      }
    }

    // A move consisting only of a single tile with no primary run (len 1) and no crossing
    // words is only legal as the very first move (bare letter at center); otherwise it means
    // the tile is floating with no connection, which should already have been caught above,
    // but we defensively re-check contiguity count here too.
    if (words.length === 1 && words[0].cells.length === 1 && !boardEmpty) {
      return { valid: false, reason: 'DISCONNECTED' };
    }

    // --- Dictionary validation ------------------------------------------------------------
    var invalidWords = [];
    words.forEach(function (w) {
      if (w.cells.length < 2) return; // single-letter "words" aren't checked (only valid on first move as a 1-tile play)
      if (!Dictionary.isValidWord(w.word)) {
        invalidWords.push(w.word);
      }
    });
    if (invalidWords.length > 0) {
      return { valid: false, reason: 'INVALID_WORD', invalidWords: invalidWords };
    }

    return { valid: true, words: words, primaryAxis: primaryAxis };
  }

  var MoveValidation = {
    validateMove: validateMove,
    // exported for scoring.js / tests to reuse without re-deriving:
    determineAxis: determineAxis,
    extractRun: extractRun,
    makeVirtualBoard: makeVirtualBoard,
    cellsToWord: cellsToWord
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MoveValidation;
  } else {
    global.Scrabble = global.Scrabble || {};
    global.Scrabble.MoveValidation = MoveValidation;
  }
})(typeof window !== 'undefined' ? window : globalThis);

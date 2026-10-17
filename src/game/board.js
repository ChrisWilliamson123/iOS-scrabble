// board.js — 15x15 premium-square layout constant and coordinate helpers.
// Exposed on the Scrabble.Board namespace (see main.js for namespace wiring).
// No ES module syntax — concatenated into a single IIFE by build/bundle.js.

(function (global) {
  'use strict';

  var SIZE = 15;
  var CENTER = 7; // 0-indexed row/col of the center star square

  // Row-encoded premium square layout. Each character maps to a square type:
  //   3 = Triple Word (TW)
  //   2 = Double Word (DW)
  //   q = Triple Letter (TL)
  //   d = Double Letter (DL)
  //   * = Center star (DW + start square)
  //   . = normal square
  // This is the standard Scrabble board layout, mirrored across all four quadrants.
  var LAYOUT_ROWS = [
    '3..d...3...d..3',
    '.2...q...q...2.',
    '..2...d.d...2..',
    'd..2...d...2..d',
    '....2.....2....',
    '.q...q...q...q.',
    '..d...d.d...d..',
    '3..d...*...d..3',
    '..d...d.d...d..',
    '.q...q...q...q.',
    '....2.....2....',
    'd..2...d...2..d',
    '..2...d.d...2..',
    '.2...q...q...2.',
    '3..d...3...d..3'
  ];

  var TYPE_MAP = {
    '3': 'TW',
    '2': 'DW',
    'q': 'TL',
    'd': 'DL',
    '*': 'STAR',
    '.': null
  };

  function buildLayout() {
    var layout = [];
    for (var r = 0; r < SIZE; r++) {
      var row = [];
      var rowStr = LAYOUT_ROWS[r];
      for (var c = 0; c < SIZE; c++) {
        row.push(TYPE_MAP[rowStr[c]]);
      }
      layout.push(row);
    }
    return layout;
  }

  var BOARD_LAYOUT = buildLayout();

  function isInBounds(row, col) {
    return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
  }

  function isCenterSquare(row, col) {
    return row === CENTER && col === CENTER;
  }

  function getSquareType(row, col) {
    if (!isInBounds(row, col)) return undefined;
    return BOARD_LAYOUT[row][col];
  }

  function createEmptyBoard() {
    var board = [];
    for (var r = 0; r < SIZE; r++) {
      var row = [];
      for (var c = 0; c < SIZE; c++) {
        row.push(null);
      }
      board.push(row);
    }
    return board;
  }

  function isBoardEmpty(board) {
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (board[r][c] !== null) return false;
      }
    }
    return true;
  }

  var Board = {
    SIZE: SIZE,
    CENTER: CENTER,
    BOARD_LAYOUT: BOARD_LAYOUT,
    isInBounds: isInBounds,
    isCenterSquare: isCenterSquare,
    getSquareType: getSquareType,
    createEmptyBoard: createEmptyBoard,
    isBoardEmpty: isBoardEmpty
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Board;
  } else {
    global.Scrabble = global.Scrabble || {};
    global.Scrabble.Board = Board;
  }
})(typeof window !== 'undefined' ? window : globalThis);

// boardGrid.js — renders the full 15x15 board grid, merging committed board state with
// this turn's pending (uncommitted) placements, and wraps it in the zoom/pan container.

(function (global) {
  'use strict';

  var Dom = typeof module !== 'undefined' && module.exports ? require('./dom.js') : global.Scrabble.Dom;
  var Board = typeof module !== 'undefined' && module.exports ? require('../board.js') : global.Scrabble.Board;
  var BoardCellComponent = typeof module !== 'undefined' && module.exports ? require('./components/boardCell.js') : global.Scrabble.BoardCellComponent;

  // options: { board, pendingPlacements, interactive, onTapEmpty, onTapPending, zoomWrapper: bool }
  function renderBoardGrid(options) {
    var board = options.board;
    var pendingByCell = {};
    (options.pendingPlacements || []).forEach(function (p) {
      pendingByCell[p.row + ',' + p.col] = p;
    });

    var rows = [];
    for (var r = 0; r < Board.SIZE; r++) {
      var rowCells = [];
      for (var c = 0; c < Board.SIZE; c++) {
        var pending = pendingByCell[r + ',' + c] || null;
        rowCells.push(BoardCellComponent.renderBoardCell({
          row: r, col: c,
          cell: board[r][c],
          pendingTile: pending,
          interactive: options.interactive,
          onTapEmpty: options.onTapEmpty,
          onTapPending: options.onTapPending
        }));
      }
      rows.push(Dom.el('div', { class: 'board-row' }, rowCells));
    }

    var grid = Dom.el('div', { class: 'board-grid' }, rows);

    if (!options.zoomWrapper) return grid;

    // Pan/zoom wrapper: CSS-transform based, activated via a toggle class the caller can
    // flip when computed cell size falls below the minimum (see styles.css / main.js).
    return Dom.el('div', { class: 'board-zoom-wrapper', id: 'board-zoom-wrapper' }, [grid]);
  }

  var BoardGrid = { renderBoardGrid: renderBoardGrid };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BoardGrid;
  } else {
    global.Scrabble = global.Scrabble || {};
    global.Scrabble.BoardGrid = BoardGrid;
  }
})(typeof window !== 'undefined' ? window : globalThis);

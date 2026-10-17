// boardCell.js — renders a single 15x15 board square: empty/premium background, or a tile.

(function (global) {
  'use strict';

  var Dom = typeof module !== 'undefined' && module.exports ? require('../dom.js') : global.Scrabble.Dom;
  var Board = typeof module !== 'undefined' && module.exports ? require('../../board.js') : global.Scrabble.Board;
  var TileComponent = typeof module !== 'undefined' && module.exports ? require('./tile.js') : global.Scrabble.TileComponent;

  var LABELS = { TW: 'TW', DW: 'DW', TL: 'TL', DL: 'DL', STAR: '\u2605' };

  // options: { row, col, cell: {letter,isBlank,owner}|null, pendingTile: {letter,isBlank}|null,
  //            interactive: bool, onTapEmpty, onTapPending }
  function renderBoardCell(options) {
    var row = options.row, col = options.col;
    var squareType = Board.getSquareType(row, col);
    var occupant = options.pendingTile || options.cell;

    var classes = ['board-cell'];
    if (squareType) classes.push('board-cell--' + squareType.toLowerCase());
    if (occupant) classes.push('board-cell--occupied');
    if (options.pendingTile) classes.push('board-cell--pending');

    var children = [];
    if (occupant) {
      children.push(TileComponent.renderTile({
        letter: occupant.letter,
        isBlank: occupant.isBlank,
        small: true,
        pending: !!options.pendingTile,
        onTap: options.pendingTile && options.interactive ? function () { options.onTapPending(row, col); } : null
      }));
    } else if (squareType && LABELS[squareType]) {
      children.push(Dom.el('span', { class: 'board-cell__label' }, [LABELS[squareType]]));
    }

    var attrs = { class: classes.join(' '), 'data-row': row, 'data-col': col };
    if (!occupant && options.interactive) {
      attrs.onClick = function () { options.onTapEmpty(row, col); };
    }

    return Dom.el('div', attrs, children);
  }

  var BoardCellComponent = { renderBoardCell: renderBoardCell };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BoardCellComponent;
  } else {
    global.Scrabble = global.Scrabble || {};
    global.Scrabble.BoardCellComponent = BoardCellComponent;
  }
})(typeof window !== 'undefined' ? window : globalThis);

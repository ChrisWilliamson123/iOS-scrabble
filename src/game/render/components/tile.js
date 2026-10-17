// tile.js — renders a single tile (used in both the rack and on the board).

(function (global) {
  'use strict';

  var Dom = typeof module !== 'undefined' && module.exports ? require('../dom.js') : global.Scrabble.Dom;
  var TileData = typeof module !== 'undefined' && module.exports ? require('../../tileData.js') : global.Scrabble.TileData;

  // options: { letter, isBlank, selected, pending, small, onTap }
  function renderTile(options) {
    options = options || {};
    var letter = options.letter;
    var isBlank = !!options.isBlank;
    var displayLetter = letter === TileData.BLANK_MARKER ? '' : letter;
    var value = isBlank || letter === TileData.BLANK_MARKER ? 0 : TileData.letterValue(letter, false);

    var classes = ['tile'];
    if (options.selected) classes.push('tile--selected');
    if (options.pending) classes.push('tile--pending');
    if (options.small) classes.push('tile--small');
    if (isBlank) classes.push('tile--blank');

    return Dom.el('button', {
      class: classes.join(' '),
      type: 'button',
      'aria-label': 'Tile ' + (displayLetter || 'blank'),
      onClick: options.onTap || null
    }, [
      Dom.el('span', { class: 'tile__letter' }, [displayLetter]),
      Dom.el('span', { class: 'tile__value' }, [value > 0 ? String(value) : ''])
    ]);
  }

  var TileComponent = { renderTile: renderTile };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TileComponent;
  } else {
    global.Scrabble = global.Scrabble || {};
    global.Scrabble.TileComponent = TileComponent;
  }
})(typeof window !== 'undefined' ? window : globalThis);

// rack.js — renders the active player's rack, excluding tiles currently placed pending
// on the board (those are shown on the board instead, visually "picked up").

(function (global) {
  'use strict';

  var Dom = typeof module !== 'undefined' && module.exports ? require('../dom.js') : global.Scrabble.Dom;
  var TileComponent = typeof module !== 'undefined' && module.exports ? require('./tile.js') : global.Scrabble.TileComponent;
  var TileData = typeof module !== 'undefined' && module.exports ? require('../../tileData.js') : global.Scrabble.TileData;

  // options: { rack: [letters], usedIndices: Set-like (array) of rack indices already
  //            placed pending on the board, selectedIndex: number|null, onSelect, onSwap }
  function renderRack(options) {
    var rack = options.rack;
    var usedIndices = options.usedIndices || [];
    var selectedIndex = options.selectedIndex;

    var slots = rack.map(function (letter, idx) {
      var isUsed = usedIndices.indexOf(idx) !== -1;
      if (isUsed) {
        return Dom.el('div', { class: 'rack__slot rack__slot--empty' }, []);
      }
      return Dom.el('div', { class: 'rack__slot' }, [
        TileComponent.renderTile({
          letter: letter,
          isBlank: letter === TileData.BLANK_MARKER,
          selected: selectedIndex === idx,
          onTap: function () { options.onSelect(idx); }
        })
      ]);
    });

    return Dom.el('div', { class: 'rack' }, slots);
  }

  var RackComponent = { renderRack: renderRack };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RackComponent;
  } else {
    global.Scrabble = global.Scrabble || {};
    global.Scrabble.RackComponent = RackComponent;
  }
})(typeof window !== 'undefined' ? window : globalThis);

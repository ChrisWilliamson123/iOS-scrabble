// interstitialScreen.js — the "pass the device" handoff screen. CRITICAL: must never
// render either player's rack. Shows a read-only board snapshot, both scores, and an
// explicit confirm button naming the incoming player.

(function (global) {
  'use strict';

  var Dom = typeof module !== 'undefined' && module.exports ? require('./dom.js') : global.Scrabble.Dom;
  var BoardGrid = typeof module !== 'undefined' && module.exports ? require('./boardGrid.js') : global.Scrabble.BoardGrid;

  // options: { state, onConfirm: function() }
  function renderInterstitialScreen(options) {
    var state = options.state;
    var incomingPlayer = state.players[state.activePlayerIndex];

    var scoreRows = state.players.map(function (p, idx) {
      var classes = 'score-row' + (idx === state.activePlayerIndex ? ' score-row--next' : '');
      return Dom.el('div', { class: classes }, [
        Dom.el('span', { class: 'score-row__name' }, [p.name]),
        Dom.el('span', { class: 'score-row__score' }, [String(p.score)])
      ]);
    });

    var boardPreview = BoardGrid.renderBoardGrid({
      board: state.board,
      pendingPlacements: [],
      interactive: false
    });

    return Dom.el('div', { class: 'screen screen--interstitial' }, [
      Dom.el('h1', { class: 'screen-title' }, ['Pass the device']),
      Dom.el('div', { class: 'card scoreboard' }, scoreRows),
      Dom.el('div', { class: 'board-preview-wrapper' }, [boardPreview]),
      Dom.el('button', {
        class: 'btn btn--primary btn--large',
        type: 'button',
        onClick: options.onConfirm
      }, [incomingPlayer.name + ", tap to reveal your rack"])
    ]);
  }

  var InterstitialScreen = { renderInterstitialScreen: renderInterstitialScreen };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = InterstitialScreen;
  } else {
    global.Scrabble = global.Scrabble || {};
    global.Scrabble.InterstitialScreen = InterstitialScreen;
  }
})(typeof window !== 'undefined' ? window : globalThis);
